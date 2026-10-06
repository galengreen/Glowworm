---
id: weighted-sum
title: Weighted sum and bias
summary: z = w · x + b. Weights scale how much each input counts; the bias shifts how easily the neuron activates.
sources: [notes#weighted-sum-and-bias]
prerequisites: [neuron]
related: [activation-function]
diagram:
  widget: neuron
  params: { x1: 1, x2: 1 }
---

$$z = w_1 x_1 + w_2 x_2 + \dots + w_n x_n + b = \mathbf{w} \cdot \mathbf{x} + b$$

| Weight | Effect of that input |
|---|---|
| Large positive | Pushes $z$ up strongly |
| Negative | Pushes $z$ down |
| Zero | Ignored |

The **bias** $b$ is added no matter what the inputs are. A very negative bias makes the neuron hard to switch on; a positive bias makes it easy. :cite[notes §2]{src=notes#weighted-sum-and-bias}

**Example:** $w = (0.6, 0.6)$, $b = -0.5$, $x = (1, 0)$ gives $z = 0.6 \cdot 1 + 0.6 \cdot 0 - 0.5 = 0.1$.
