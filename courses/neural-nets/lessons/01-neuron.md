---
id: 01-neuron
title: A single neuron
level: neuron
concepts: [neuron, weighted-sum, activation-function]
---

## What a neuron does {#neuron-what}

::figure{widget=neuron predict="Input x₁ is on, x₂ is off. Both weights are 0.6 and the bias is −0.5. Will the output lamp light?"}

A :concept[neuron]{id=neuron} takes inputs, **weighs** them, **sums** them with a bias, and **activates**. Press the input blocks and watch the signal flow along the wires. :cite[notes §1]{src=notes#artificial-neurons}

::recall{q=neuron-steps}

## Weights and bias {#neuron-weights}

:::callout{type=key}
$z = w_1 x_1 + w_2 x_2 + b$. Weights scale how much each input counts. The bias shifts the total, whatever the inputs. :cite[notes §2]{src=notes#weighted-sum-and-bias}
:::

In the figure above, try lowering $w_1$ below zero with the **a** key while $x_1$ is on. A negative weight means that input now *argues against* the neuron firing. That's the whole idea of a :concept[weighted sum]{id=weighted-sum}.

::recall{q=ws-compute}

## The activation: a switch {#neuron-activation}

The sum $z$ is just a number. The :concept[activation function]{id=activation-function} turns it into an output. Our neuron uses a **step**: output 1 if $z > 0$, otherwise 0. :cite[notes §3]{src=notes#activation-functions}

| Function | Output |
|---|---|
| Step | $1$ if $z > 0$, else $0$ |
| Sigmoid | smooth 0 → 1 |
| ReLU | $\max(0, z)$ |

::recall{q=act-why-nonlinear}

## Make it an AND gate {#neuron-and}

:::figure{widget=neuron x1=1 x2=1 w1=0.6 w2=0.6 predict="Right now this neuron is an OR gate. What would you change so it only lights when BOTH inputs are on?"}
**Try it:** turn inputs on and off, then use **q/a** and **w/s** to change the weights until the lamp lights only for $x = (1, 1)$.
:::

:::steps
1. With $b = -0.5$, one input alone must give $z \le 0$, so each weight must be at most $0.5$.
2. Both inputs together must give $z > 0$, so $w_1 + w_2 > 0.5$.
3. $w_1 = w_2 = 0.3$ works: one input gives $0.3 - 0.5 = -0.2$ (off), both give $0.6 - 0.5 = 0.1$ (on). :cite[notes §4]{src=notes#logic-gates-with-a-perceptron}
:::

::recall{q=ws-and-gate}
