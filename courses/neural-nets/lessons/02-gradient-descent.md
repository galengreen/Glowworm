---
id: 02-gradient-descent
title: Learning by gradient descent
level: learning
concepts: [loss-function, gradient, gradient-descent, learning-rate]
---

## Measuring how wrong {#gd-loss}

Before a network can improve, it needs a score for how wrong it is: the :concept[loss]{id=loss-function}. For one prediction, the squared error is $(\hat{y} - y)^2$. Lower is better. :cite[notes §5]{src=notes#loss-functions}

:::callout{type=why}
Squaring makes every error positive, and punishes big errors far more than small ones. An error of 2 costs 4; an error of 4 costs 16.
:::

::recall{q=loss-square}

## The slope points uphill {#gd-gradient}

:::figure{widget=gradient-descent lr=0.1 predict="The point starts at w = −2, left of the minimum. Is the slope there positive or negative, and which way should w move?"}
The straight line touching the curve is the **tangent**: its slope is the :concept[gradient]{id=gradient}. Press **Step** a few times and watch the slope shrink as the point nears the bottom.
:::

A negative slope means increasing $w$ *lowers* the loss, so we should move right. :cite[notes §6]{src=notes#gradients}

::recall{q=grad-sign}

## Step downhill {#gd-update}

:::callout{type=key}
$$w \leftarrow w - \eta \, \frac{\partial L}{\partial w}$$
Move **against** the gradient, scaled by the learning rate $\eta$. :cite[notes §7]{src=notes#gradient-descent}
:::

:::steps
1. Loss $L(w) = \tfrac12 (w - 3)^2$, so the gradient is $w - 3$. Start at $w = 1$ with $\eta = 0.5$.
2. Gradient at $w = 1$: $1 - 3 = -2$.
3. Update: $w = 1 - 0.5 \times (-2) = 2$.
4. Again: gradient $2 - 3 = -1$, so $w = 2 - 0.5 \times (-1) = 2.5$. Each step halves the distance to 3.
:::

::recall{q=gd-update}

## How big a step? {#gd-lr}

:::figure{widget=gradient-descent lr=0.3 predict="What do you think happens if you drag the learning rate up to 2.1 and press Run?"}
Drag **η** and press **Run**. Find a learning rate that creeps, one that converges quickly, one that oscillates, and one that diverges.
:::

The :concept[learning rate]{id=learning-rate} is a trade-off: too small is slow, too large overshoots. :cite[notes §8]{src=notes#choosing-the-learning-rate}

::recall{q=lr-too-big}
