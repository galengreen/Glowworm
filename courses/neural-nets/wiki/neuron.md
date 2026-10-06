---
id: neuron
title: Artificial neuron
summary: Multiplies each input by a weight, adds a bias, and passes the total through an activation function to give one output.
sources: [notes#artificial-neurons]
prerequisites: []
related: [weighted-sum, activation-function]
diagram: neuron
---

An artificial neuron is the building block of a neural network. It does three things, in order:

1. **Weigh** each input $x_i$ by its weight $w_i$.
2. **Sum** the weighted inputs and add a bias $b$ to get $z$: the :concept[weighted sum]{id=weighted-sum}.
3. **Activate:** pass $z$ through an :concept[activation function]{id=activation-function} to get the output $y$. :cite[notes §1]{src=notes#artificial-neurons}

The weights and bias are the neuron's **parameters**. Training a network means adjusting them to reduce the :concept[loss]{id=loss-function}.

### Common misconception

A neuron does not "store" an answer. It's a small function whose behaviour is set entirely by its weights and bias. Change those, and the same neuron computes something different, as in the logic-gate examples. :cite[notes §4]{src=notes#logic-gates-with-a-perceptron}
