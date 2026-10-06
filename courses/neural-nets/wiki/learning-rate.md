---
id: learning-rate
title: Learning rate
summary: The step size η in gradient descent. Too small is slow; too large overshoots and can diverge.
sources: [notes#choosing-the-learning-rate]
prerequisites: [gradient-descent]
related: []
diagram:
  widget: gradient-descent
  params: { lr: 1.6 }
---

| Learning rate | What happens |
|---|---|
| Too small | Stable, but very slow |
| Well chosen | Loss falls quickly and settles |
| Too large | Overshoots the minimum and bounces; large enough and it **diverges** |

:cite[notes §8]{src=notes#choosing-the-learning-rate}

For $L(w) = \tfrac12 (w - 3)^2$, each step multiplies the distance to the minimum by $(1 - \eta)$:

- $0 < \eta < 1$: creeps in from one side
- $1 < \eta < 2$: oscillates, but still converges
- $\eta = 2$: bounces forever
- $\eta > 2$: diverges
