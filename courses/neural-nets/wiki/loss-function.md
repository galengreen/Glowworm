---
id: loss-function
title: Loss function
summary: One number measuring how wrong the predictions are. Training means making it as small as possible.
sources: [notes#loss-functions]
prerequisites: [neuron]
related: [gradient]
diagram:
  widget: gradient-descent
  params: { lr: 0.3 }
---

The loss compares predictions $\hat{y}$ with targets $y$. Lower is better. :cite[notes §5]{src=notes#loss-functions}

The **squared error** of one prediction is $(\hat{y} - y)^2$; the **mean squared error (MSE)** averages it over the dataset.

Squaring does two things:

- Every error counts as positive, so over- and under-predictions can't cancel out.
- Big errors are punished much more than small ones: an error of 2 costs 4, an error of 4 costs 16.

If you plot the loss against a weight you get a landscape. Training is a search for its lowest point, which is what :concept[gradient descent]{id=gradient-descent} does.
