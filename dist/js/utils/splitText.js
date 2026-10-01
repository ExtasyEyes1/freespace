// Работаем с текстовыми узлами, сохраняя <em>, <br> и пробелы в исходном заголовке.
export function splitText(element) {
  if (element.dataset.split === 'true') return [...element.querySelectorAll('.word')];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let index = 0;
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const part of node.textContent.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) fragment.append(document.createTextNode(part));
      else {
        const word = document.createElement('span');
        word.className = 'word';
        word.textContent = part;
        word.style.setProperty('--word-delay', `${Math.min(index++, 15) * .055}s`);
        fragment.append(word);
      }
    }
    node.replaceWith(fragment);
  }
  element.dataset.split = 'true';
  element.classList.add('split-text');
  return [...element.querySelectorAll('.word')];
}

