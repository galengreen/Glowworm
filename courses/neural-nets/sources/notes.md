# How a neural network learns: lecture notes

> **Sample source.** Written for the LearnSmart prototype so the citation chain (question → wiki → source) has something real to point at. Replace with actual course material (slides, notes, past papers).

## Artificial neurons

An artificial neuron takes several numeric inputs and produces one output. Each input $x_i$ is multiplied by a **weight** $w_i$, the results are added together with a **bias** $b$, and the total is passed through an **activation function**. A network is many of these neurons connected in layers, where the outputs of one layer are the inputs of the next.

The weights and bias are the neuron's *parameters*. Learning means adjusting the parameters so the outputs become more useful.

## Weighted sum and bias

The neuron first computes the weighted sum

$$z = w_1 x_1 + w_2 x_2 + \dots + w_n x_n + b = \mathbf{w} \cdot \mathbf{x} + b$$

A large positive weight means the input pushes the sum up strongly; a negative weight means the input pushes it down. A weight of zero means the input is ignored. The bias shifts the sum regardless of the inputs: it sets how easily the neuron activates. For example, with $w = (0.6, 0.6)$, $b = -0.5$ and $x = (1, 0)$, the sum is $0.6 - 0.5 = 0.1$.

## Activation functions

The activation function $f$ turns the sum $z$ into the output $y = f(z)$.

- **Step:** $y = 1$ if $z > 0$, otherwise $0$. Simple, but its slope is zero almost everywhere, so it can't be trained with gradients.
- **Sigmoid:** $y = 1 / (1 + e^{-z})$. A smooth version of the step, between 0 and 1.
- **ReLU:** $y = \max(0, z)$. The most common choice in modern deep networks.

Without a non-linear activation, stacking layers gains nothing: a chain of weighted sums is still just one weighted sum, so the network could only represent linear functions.

## Logic gates with a perceptron

A perceptron is a single neuron with a step activation. With two binary inputs it can compute some logic gates by choosing weights and bias:

| Gate | $w_1$ | $w_2$ | $b$ |
|---|---|---|---|
| OR | 0.6 | 0.6 | −0.5 |
| AND | 0.3 | 0.3 | −0.5 |

For AND, a single input gives $0.3 - 0.5 = -0.2$ (off) but both give $0.6 - 0.5 = 0.1$ (on). A single perceptron **cannot** compute XOR, because no straight line separates XOR's true cases from its false ones. XOR needs a hidden layer.

## Loss functions

A loss function measures how wrong the network's predictions are, as a single number: lower is better. For one prediction $\hat{y}$ with target $y$, the **squared error** is $(\hat{y} - y)^2$. Averaged over a dataset this is the **mean squared error (MSE)**. Training means finding parameters that make the loss as small as possible.

Squaring makes every error positive and punishes large errors much more than small ones: an error of 2 costs 4, an error of 4 costs 16.

## Gradients

The gradient of the loss with respect to a parameter is the slope of the loss if you change only that parameter. With many parameters, the gradient is the vector of all these slopes, $\nabla L$. It points in the direction in which the loss increases fastest.

- A positive slope means increasing the weight increases the loss.
- A negative slope means increasing the weight decreases the loss.
- A slope of zero means you are at a flat point, such as a minimum.

For the example loss $L(w) = \tfrac12 (w - 3)^2$, the gradient is $L'(w) = w - 3$. At $w = 1$ the slope is $-2$.

Neural networks compute gradients for every weight efficiently with **backpropagation**, which applies the chain rule backwards through the layers.

## Gradient descent

Gradient descent repeatedly moves each parameter a small step **against** its gradient:

$$w \leftarrow w - \eta \, \frac{\partial L}{\partial w}$$

where $\eta$ (eta) is the **learning rate**. Because the gradient points uphill, subtracting it moves downhill. Near a minimum the slope shrinks, so the steps shrink too.

Worked example with $L(w) = \tfrac12 (w - 3)^2$, $\eta = 0.5$, starting at $w = 1$: the gradient is $1 - 3 = -2$, so $w \leftarrow 1 - 0.5 \times (-2) = 2$. The next gradient is $-1$, so $w \leftarrow 2.5$, then $2.75$, halving the distance to the minimum each step.

In practice the gradient is estimated from a small random batch of examples rather than the whole dataset: **stochastic (mini-batch) gradient descent**.

## Choosing the learning rate

The learning rate controls the step size.

- **Too small:** training is stable but very slow.
- **Well chosen:** the loss falls quickly and settles at the minimum.
- **Too large:** steps overshoot the minimum. The weight bounces from side to side, and if the rate is large enough each overshoot is bigger than the last and the loss **diverges** (grows without limit).

For $L(w) = \tfrac12 (w - 3)^2$ each step multiplies the distance to the minimum by $(1 - \eta)$. With $0 < \eta < 1$ it creeps in from one side; with $1 < \eta < 2$ it oscillates but still converges; at $\eta = 2$ it bounces forever; above 2 it diverges.
