---
id: gradient-descent
title: Gradient descent
summary: Repeatedly step each parameter against its gradient, w ← w − η·∂L/∂w, to walk downhill on the loss.
sources: [notes#gradient-descent]
prerequisites: [gradient]
related: [learning-rate]
diagram:
  widget: gradient-descent
  params: { lr: 0.5 }
---

$$
w \leftarrow w - \eta \, \frac{\partial L}{\partial w}
$$
The :concept[gradient]{id=gradient} points uphill, so subtracting it moves downhill. The :concept[learning rate]{id=learning-rate} $\eta$ scales the step. Near the minimum the slope shrinks, so the steps shrink too. :cite[notes §7]{src=notes#gradient-descent}

### Worked example

$L(w) = \tfrac12 (w - 3)^2$, $\eta = 0.5$, start at $w = 1$:

| Step | $w$ | Gradient $w - 3$ | New $w$ |
|---|---|---|---|
| 1 | 1 | −2 | $1 - 0.5 \times (-2) = 2$ |
| 2 | 2 | −1 | 2.5 |
| 3 | 2.5 | −0.5 | 2.75 |

Each step halves the distance to the minimum at $w = 3$.

In practice the gradient is estimated from a small random **mini-batch** of examples: stochastic gradient descent.
