---
id: gradient
title: Gradient
summary: The slope of the loss with respect to each parameter. It points uphill, the direction where loss grows fastest.
sources: [notes#gradients]
prerequisites: [loss-function]
related: [gradient-descent]
diagram:
  widget: gradient-descent
  params: { lr: 0.1 }
---

For one weight, the gradient is the slope of the :concept[loss]{id=loss-function} curve at the current point. With many weights it's the vector of all those slopes, $\nabla L$. :cite[notes §6]{src=notes#gradients}

| Slope | Meaning |
|---|---|
| Positive | Increasing the weight *increases* the loss |
| Negative | Increasing the weight *decreases* the loss |
| Zero | Flat: possibly the minimum |

**Example:** for $L(w) = \tfrac12 (w - 3)^2$, the gradient is $L'(w) = w - 3$. At $w = 1$ the slope is $-2$, so increasing $w$ reduces the loss.

Networks compute every gradient efficiently with **backpropagation**, which applies the chain rule backwards through the layers.
