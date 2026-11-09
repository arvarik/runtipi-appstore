import { describe, expect, test } from "bun:test";
import {
  appInfoSchema,
  convertLegacyToYaml,
  dynamicComposeSchemaArk,
  dynamicComposeSchemaYaml,
} from "@runtipi/common/schemas";
import { type } from "arktype";
import fs from "node:fs";
import path from "node:path";
import { fromError } from "zod-validation-error";

const getApps = async () => {
  const appsPath = path.join(process.cwd(), "apps");
  const entries = await fs.promises.readdir(appsPath);
  return entries.filter((entry) =>
    fs.statSync(path.join(appsPath, entry)).isDirectory(),
  );
};

const getFile = async (app: string, file: string) => {
  const filePath = path.join(process.cwd(), "apps", app, file);
  try {
    return await fs.promises.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
};

const getBinaryFile = async (app: string, file: string) => {
  const filePath = path.join(process.cwd(), "apps", app, file);
  try {
    return await fs.promises.readFile(filePath);
  } catch {
    return null;
  }
};

/**
 * Parse width and height from a JPEG buffer by scanning for an SOFn frame marker.
 */
const readJpegDimensions = (buf: Buffer): { width: number; height: number } | null => {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    while (offset < buf.length && buf[offset] === 0xff) offset++;
    const marker = buf[offset];
    offset++;
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > buf.length) return null;
    const segmentLength = buf.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buf.length) return null;
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (offset + 7 > buf.length) return null;
      return {
        height: buf.readUInt16BE(offset + 3),
        width: buf.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return null;
};

/**
 * @runtipi/common 1.1.3 marks `x-runtipi.overrides` as required even though
 * Runtipi marks it optional in packages/common/src/schemas/compose-yaml.ts.
 */
const withOverridesDefault = (compose: unknown) => {
  if (compose && typeof compose === "object" && "x-runtipi" in compose) {
    const meta = (compose as Record<string, unknown>)["x-runtipi"];
    if (meta && typeof meta === "object" && !("overrides" in meta)) {
      return { ...compose, "x-runtipi": { ...meta, overrides: [] } };
    }
  }
  return compose;
};

test("apps directory exists", () => {
  expect(fs.existsSync(path.join(process.cwd(), "apps"))).toBe(true);
});

describe("each app has the required files and valid schemas", async () => {
  const apps = await getApps();

  for (const app of apps) {
    const requiredFiles = [
      "config.json",
      "docker-compose.yml",
      "docker-compose.json",
      "metadata/logo.jpg",
      "metadata/description.md",
    ];

    for (const file of requiredFiles) {
      test(`app ${app} has ${file}`, async () => {
        const content = await getBinaryFile(app, file);
        expect(content).not.toBeNull();
        expect(content!.byteLength).toBeGreaterThan(0);
      });
    }

    test(`app ${app} has a 512x512 JPEG logo`, async () => {
      const logo = await getBinaryFile(app, "metadata/logo.jpg");
      expect(logo).not.toBeNull();
      const dims = readJpegDimensions(logo!);
      expect(dims).toEqual({ width: 512, height: 512 });
    });

    test(`app ${app} has a valid config.json`, async () => {
      const fileContent = await getFile(app, "config.json");
      const raw = JSON.parse(fileContent || "{}");
      const parsed = appInfoSchema.omit("urn")(raw);

      if (parsed instanceof type.errors) {
        console.error(
          `Error parsing config.json for app ${app}:`,
          fromError(parsed).toString(),
        );
      }

      expect(parsed instanceof type.errors).toBe(false);
      expect(raw.id).toBe(app);

      for (const field of raw.form_fields ?? []) {
        if (field.type === "random") {
          expect(field.required).not.toBe(true);
        }
      }
    });

    test(`app ${app} has valid docker-compose.yml and docker-compose.json that agree`, async () => {
      const config = JSON.parse((await getFile(app, "config.json")) || "{}");
      const yamlContent = await getFile(app, "docker-compose.yml");
      const jsonContent = await getFile(app, "docker-compose.json");

      expect(yamlContent).not.toBeNull();
      expect(jsonContent).not.toBeNull();

      const yamlObj = Bun.YAML.parse(yamlContent!) as Record<string, unknown>;
      const parsedYaml = dynamicComposeSchemaYaml(withOverridesDefault(yamlObj));
      if (parsedYaml instanceof type.errors) {
        console.error(
          `Error parsing docker-compose.yml for app ${app}:`,
          parsedYaml.summary,
        );
      }
      expect(parsedYaml instanceof type.errors).toBe(false);
      expect((yamlObj["x-runtipi"] as Record<string, unknown>)?.schema_version).toBe(2);

      const jsonObj = JSON.parse(jsonContent!);
      const parsedJson = dynamicComposeSchemaArk(jsonObj);
      if (parsedJson instanceof type.errors) {
        console.error(
          `Error parsing docker-compose.json for app ${app}:`,
          parsedJson.summary,
        );
      }
      expect(parsedJson instanceof type.errors).toBe(false);
      expect(jsonObj.schemaVersion).toBe(2);

      const convertedFromJson = convertLegacyToYaml(jsonObj);
      expect(convertedFromJson.services).toEqual(yamlObj.services as Record<string, unknown>);

      const yamlServices = Object.values(
        (yamlObj.services ?? {}) as Record<string, { image?: string }>,
      );
      expect(yamlServices.length).toBeGreaterThan(0);

      for (const svc of yamlServices) {
        expect(svc.image).toBeDefined();
        const tag = svc.image!.split(":").at(1);
        expect(tag).toBeDefined();
        expect(tag).not.toBe("latest");
        expect(tag).toBe(config.version);
      }
    });
  }
});
