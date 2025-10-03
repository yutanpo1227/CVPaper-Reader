import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pipeline } from "@xenova/transformers";

const MODEL_NAME = "Xenova/multilingual-e5-large";
const QUERY_PREFIX = "passage: ";

const entries = [
  {
    title: "GFPose: Learning 3D Human Pose Prior With Gradient Fields",
    authors:
      "Hai Ci, Mingdong Wu, Wentao Zhu, Xiaoxuan Ma, Hao Dong, Fangwei Zhong, Yizhou Wang",
    year: "2023",
    url: "https://openaccess.thecvf.com/content/CVPR2023/html/Ci_GFPose_Learning_3D_Human_Pose_Prior_With_Gradient_Fields_CVPR_2023_paper.html",
    abstract:
      "Learning 3D human pose prior is essential to human-centered AI. Here, we present GFPose, a versatile framework to model plausible 3D human poses for various applications. At the core of GFPose is a time-dependent score network, which estimates the gradient on each body joint and progressively denoises the perturbed 3D human pose to match a given task specification. During the denoising process, GFPose implicitly incorporates pose priors in gradients and unifies various discriminative and generative tasks in an elegant framework. Despite the simplicity, GFPose demonstrates great potential in several downstream tasks. Our experiments empirically show that 1) as a multi-hypothesis pose estimator, GFPose outperforms existing SOTAs by 20% on Human3.6M dataset. 2) as a single-hypothesis pose estimator, GFPose achieves comparable results to deterministic SOTAs, even with a vanilla backbone. 3) GFPose is able to produce diverse and realistic samples in pose denoising, completion and generation tasks.",
  },
  {
    title:
      "NoisyTwins: Class-Consistent and Diverse Image Generation Through StyleGANs",
    authors: "Lin Chen, Arun Gupta, Sofia Martinez, Hiroshi Tanaka",
    year: "2023",
    url: "https://openaccess.thecvf.com/content/CVPR2023/html/Chen_NoisyTwins_Class-Consistent_and_Diverse_Image_Generation_Through_StyleGANs_CVPR_2023_paper.html",
    abstract:
      "We introduce NoisyTwins, a simple yet effective method to improve class-consistency and diversity in conditional image generation with StyleGANs. Our approach injects stochastic noise into multiple layers of the generator while aligning the intermediate representations across twin generators. This encourages the model to capture class-specific variations without sacrificing fidelity. Experiments on several benchmarks demonstrate that NoisyTwins achieves better FID and precision-recall trade-offs compared to recent conditional generative models.",
  },
];

const embedder = await pipeline("feature-extraction", MODEL_NAME);

function escapeLiteral(value) {
  return value.replace(/'/g, "''");
}

function formatVector(vector) {
  return `'[${vector.map((v) => v.toFixed(8)).join(",")}]'::vector(1024)`;
}

const valueRows = [];

for (const entry of entries) {
  const output = await embedder(QUERY_PREFIX + entry.abstract, {
    pooling: "mean",
  });
  const rawVector = Array.from(output.data);
  const norm = Math.sqrt(
    rawVector.reduce((acc, value) => acc + value * value, 0),
  );
  const vector = norm ? rawVector.map((value) => value / norm) : rawVector;
  const row = `  ('${escapeLiteral(entry.title)}', '${escapeLiteral(entry.authors)}', '${escapeLiteral(entry.year)}', '${escapeLiteral(entry.url)}', '${escapeLiteral(entry.abstract)}', ${formatVector(vector)})`;
  valueRows.push(row);
}

const sql = `-- Seeded sample data for Articles\ntruncate table public."Articles" restart identity;\n\ninsert into public."Articles" (title, authors, year, url, abstract, abstract_embedding)\nvalues\n${valueRows.join(",\n")}\n;\n`;

const outputPath = fileURLToPath(
  new URL("../../supabase/seed.sql", import.meta.url),
);
writeFileSync(outputPath, sql, { encoding: "utf-8" });

console.log("Seed file written to", outputPath);
