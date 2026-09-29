import { glob } from "astro/loaders";
// astro:content 里再导出的 z 在 Astro 7 已标记弃用，改从 astro/zod 取
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

import { LOCALES } from "./i18n/locales";

/** 各语言的营销文案；语言作为 key 放在同一个产品文件里，便于对照维护 */
const productCopy = z.object({
  titleSuffix: z.string(),
  tagline: z.string(),
  description: z.string(),
  features: z.array(z.string()),
  availabilityNote: z.string().optional(),
});

/** 产品截图文件在 public/products/<id>/ 下，说明文字随页面语言切换 */
const productScreenshot = z.object({
  image: z.string(),
  alt: z.record(z.enum(LOCALES), z.string()),
});

/**
 * 产品注册表：src/content/products/<id>.yaml，文件名即 URL 段。
 * 加一个 app = 加一个 yaml，不需要新建路由文件。
 */
const products = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/products" }),
  schema: z.object({
    /** 首页列表顺序 */
    order: z.number().default(99),
    /** 字标（不翻译） */
    name: z.string(),
    latinName: z.string(),
    theme: z.enum(["default", "warm"]).default("default"),
    version: z.string().optional(),
    updated: z.coerce.date(),
    appStoreUrl: z.url().nullable().default(null),
    testFlightUrl: z.url().nullable().default(null),
    operatingSystem: z.string().optional(),
    screenshots: z.array(productScreenshot).default([]),
    /** 默认语言必须有文案，其他语言可缺（缺时回退到默认语言） */
    copy: z
      .record(z.enum(LOCALES), productCopy)
      .refine((value) => Boolean(value[LOCALES[0]]), {
        message: `产品文案至少要有默认语言 ${LOCALES[0]}`,
      }),
  }),
});

/**
 * 产品文档（法务 / 帮助）：src/content/legal/<product>/<locale>/<doc>.md
 *
 * 目录即语言。缺某个语言的译文不会阻塞构建 —— 该语言下会回退渲染默认语言的正文，
 * 并把那一页标为 noindex，避免被当成重复内容。
 */
const legal = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.md",
    base: "./src/content/legal",
    /*
     * 默认的 id 生成会把路径小写化，"zh-CN" 会变成 "zh-cn"，
     * 于是按 locale 精确匹配就失效了。这里保留原始路径，只去掉扩展名。
     */
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** 更新日期按语言各自格式化，不写死在正文里 */
    updated: z.coerce.date(),
  }),
});

export const collections = { products, legal };
