---
id: activation-function
title: Activation function
summary: Turns the weighted sum into the neuron's output. It must be non-linear, or stacked layers collapse into one.
sources: [notes#activation-functions, notes#logic-gates-with-a-perceptron]
prerequisites: [weighted-sum]
related: [gradient]
diagram:
  widget: neuron
  params: { x1: 1, x2: 0, w1: 0.3, w2: 0.3 }
---

The activation function $f$ maps the sum to the output: $y = f(z)$. :cite[notes §3]{src=notes#activation-functions}

| Function | Formula | Notes |
|---|---|---|
| Step | $1$ if $z > 0$, else $0$ | Used by the perceptron. Slope is zero almost everywhere, so it can't learn by :concept[gradient descent]{id=gradient-descent} |
| Sigmoid | $1 / (1 + e^{-z})$ | Smooth step between 0 and 1 |
| ReLU | $\max(0, z)$ | The default in modern deep networks |

### Why non-linear?

A weighted sum of weighted sums is still a weighted sum. Without a non-linear activation, a 100-layer network could only represent the same straight-line functions as a single layer.

### What one neuron can't do

A perceptron can compute AND and OR, but not XOR: no single straight line separates XOR's true cases from its false ones. XOR needs a hidden layer. :cite[notes §4]{src=notes#logic-gates-with-a-perceptron}
