import { pipeline } from "@xenova/transformers";

const model = await pipeline(
  "feature-extraction",
  "Xenova/multilingual-e5-large",
);

async function embed(text) {
  const output = await model(`query: ${text}`, {
    pooling: "mean",
  });
  const raw = Array.from(output.data);
  const norm = Math.sqrt(raw.reduce((acc, value) => acc + value * value, 0));
  return norm ? raw.map((value) => value / norm) : raw;
}

const samples = [
  {
    title: "GFPose: Learning 3D Human Pose Prior With Gradient Fields",
    text: "Learning 3D human pose prior is essential to human-centered AI. Here, we present GFPose, a versatile framework to model plausible 3D human poses for various applications. At the core of GFPose is a time-dependent score network, which estimates the gradient on each body joint and progressively denoises the perturbed 3D human pose to match a given task specification. During the denoising process, GFPose implicitly incorporates pose priors in gradients and unifies various discriminative and generative tasks in an elegant framework. Despite the simplicity, GFPose demonstrates great potential in several downstream tasks. Our experiments empirically show that 1) as a multi-hypothesis pose estimator, GFPose outperforms existing SOTAs by 20% on Human3.6M dataset. 2) as a single-hypothesis pose estimator, GFPose achieves comparable results to deterministic SOTAs, even with a vanilla backbone. 3) GFPose is able to produce diverse and realistic samples in pose denoising, completion and generation tasks.",
  },
  {
    title:
      "NoisyTwins: Class-Consistent and Diverse Image Generation Through StyleGANs",
    text: "We introduce NoisyTwins, a simple yet effective method to improve class-consistency and diversity in conditional image generation with StyleGANs. Our approach injects stochastic noise into multiple layers of the generator while aligning the intermediate representations across twin generators. This encourages the model to capture class-specific variations without sacrificing fidelity. Experiments on several benchmarks demonstrate that NoisyTwins achieves better FID and precision-recall trade-offs compared to recent conditional generative models.",
  },
];

const results = [];
for (const sample of samples) {
  const vector = await embed(sample.text);
  results.push({ title: sample.title, vector });
}

console.log(JSON.stringify(results));
