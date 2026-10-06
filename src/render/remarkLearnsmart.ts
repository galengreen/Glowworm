// Turns remark-directive nodes into custom elements the player renders as components.
import type { Root, Text } from 'mdast';
import { visit } from 'unist-util-visit';

const TAGS: Record<string, string> = {
  callout: 'ls-callout',
  figure: 'ls-figure',
  recall: 'ls-recall',
  concept: 'ls-concept',
  cite: 'ls-cite',
  steps: 'ls-steps',
};

export function remarkLearnsmart() {
  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      if (node.type !== 'containerDirective' && node.type !== 'leafDirective' && node.type !== 'textDirective') return;
      const tag = TAGS[node.name];
      if (!tag) {
        // Not ours (e.g. "ratio 1:2"): put the text back.
        if (node.type === 'textDirective' && parent && index !== undefined) {
          const text: Text = { type: 'text', value: `:${node.name}` };
          parent.children.splice(index, 1, text, ...(node.children as Text[]));
        }
        return;
      }
      const data = (node.data ??= {});
      data.hName = tag;
      data.hProperties = { ...(node.attributes ?? {}) } as Record<string, string>;
    });
  };
}
