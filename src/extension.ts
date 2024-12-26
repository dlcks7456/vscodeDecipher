// {
//   "name": "meta.tag.style.xml",
//   "begin": "\\s*<!\\[CDATA\\[",
//   "beginCaptures": {
//     "0": { "name": "meta.tag.style.xml" }
//   },
//   "end": "\\]\\]>\\s*",
//   "endCaptures": {
//     "0": { "name": "meta.tag.style.xml" }
//   },
//   "contentName": "source.html",
//   "patterns": [
//     { "include": "text.html.basic" },
//     { "include": "source.css" },
//     { "include": "source.js" }
//   ]
// },

import * as vscode from 'vscode';

function cartesianProduct<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, curr) => {
      const res: T[][] = [];
      acc.forEach((a) => {
        curr.forEach((b) => {
          res.push([...a, b]);
        });
      });
      return res;
    },
    [[]]
  );
}

const isAlpha = (char: string): boolean => /^[a-zA-Z]+$/.test(char);
const isDigit = (char: string): boolean => /^[0-9]+$/.test(char);

function fixUniCode(input: string): string {
  input = input
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"');
  input = input.replace(/&\s/g, '&amp; ');
  return input;
}

function processText(input: string): string[] {
  return input
    .replace(/\t+/g, ' ') // 탭을 공백으로 치환
    .replace(/\n +\n/g, '\n\n') // 공백으로 채워진 줄 제거
    .replace(/\n{2,}/g, '\n') // 여러 개의 연속된 빈 줄을 하나로 줄임
    .trim() // 양 끝 공백 제거
    .split('\n') // 줄바꿈으로 텍스트 분리
    .map((line) => line.trim()); // 각 줄 양 끝 공백 제거
}

// 기타 공통 함수
function isOtherSpecify(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return (
    (lowerContent.includes('other') && (lowerContent.includes('specify') || lowerContent.includes('specific'))) ||
    (content.includes('기타') && content.includes('구체적'))
  );
}

// 중복 요소 검사
function checkDupeElement(checkText: string): string {
  const printLabel: string[] = [];
  const printText: string[] = [];
  const lines = checkText.split('\n');

  lines.forEach((line) => {
    if (line.trim()) {
      // label 값 추출
      const labelMatch = line.match(/label="([^"]+)"/);
      if (labelMatch) {
        printLabel.push(labelMatch[1]);
      }

      // 텍스트 추출
      const textMatch = line.match(/>([^<]+)</);
      if (textMatch) {
        const text = textMatch[1].trim().replace(/\s+/g, '').toUpperCase();
        printText.push(text);
      }
    }
  });

  // 중복 검사
  const duplicateLabels = findDuplicatesList(printLabel);
  const duplicateTexts = findDuplicatesList(printText);

  let rawText = checkText;

  if (duplicateLabels.length > 0) {
    const dupLabel = duplicateLabels.join(', ');
    //vscode.window.showErrorMessage(`❌ ERROR Duplicate Label: ${dupLabel}`);
    rawText += `<note>❌ ERROR Duplicate Label: ${dupLabel}</note>\n`;
  }

  if (duplicateTexts.length > 0) {
    const dupText = duplicateTexts.join(', ');
    //vscode.window.showErrorMessage(`❌ ERROR Duplicate Text: ${dupText}`);
    rawText += `<note>❌ ERROR Duplicate Text: ${dupText}</note>\n`;
  }

  return rawText;
}

function findDuplicatesList(items: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  items.forEach((item) => {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  });

  return Array.from(duplicates);
}

// 태그 변환 함수
function applyTagTransformation(editor: vscode.TextEditor, tagFormatter: (text: string) => string): void {
  try {
    const selections = editor.selections;

    editor.edit((editBuilder) => {
      selections.forEach((selection) => {
        const text = editor.document.getText(selection).trim();
        if (text) {
          const transformedText = tagFormatter(text);
          editBuilder.replace(selection, transformedText);
        }
      });
    });
  } catch (error: any) {
    console.error(error);
    vscode.window.showErrorMessage(`Error: ${error.message}`);
  }
}

// 명령 등록 함수
function registerCommand(
  context: vscode.ExtensionContext,
  commandName: string,
  tagFormatter: (text: string) => string
): void {
  const command = vscode.commands.registerCommand(commandName, () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }
    applyTagTransformation(editor, tagFormatter);
  });
  context.subscriptions.push(command);
}

// 공통 명령 실행 함수
const executeCommand = async (
  includeValue: boolean,
  attrType: 'row' | 'col' | 'choice' | 'group' = 'row',
  matchLabel: boolean = false
) => {
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const labelDict = {
      row: 'r',
      col: 'c',
      choice: 'ch',
      group: 'g',
    };

    const document = editor.document;
    let selections = editor.selections;

    for (const selection of selections) {
      let text = document.getText(selection);
      if (!text) {
        text = '';
      }

      const lines = processText(text);

      let printPage = '';

      lines.forEach((line, index) => {
        let ordinal = '';
        let content = line;
        let extra = '';

        if (matchLabel) {
          const parts = line.split(/\s/, 2); // 첫 번째 공백을 기준으로 분리
          ordinal = parts[0]?.trim().replace(/[.)]+$/, ''); // 끝에 붙은 . 또는 ) 제거
          content = parts.length === 2 ? parts[1].trim() : content;
        }

        if (isOtherSpecify(content) && attrType !== 'group') {
          extra = ' open="1" openSize="25" randomize="0"';
        }

        // 태그 구성
        if (matchLabel) {
          if (isAlpha(ordinal[0] || '') && content) {
            printPage += `\t<${attrType} label="${ordinal}"${extra}>${content}</${attrType}>\n`;
          } else if (isDigit(ordinal[0] || '')) {
            printPage += `\t<${attrType} label="${labelDict[attrType]}${ordinal}"${extra}>${content}</${attrType}>\n`;
          } else {
            printPage += `\t<${attrType} label="${labelDict[attrType]}${index + 1}"${extra}>${content}</${attrType}>\n`;
          }
        } else {
          const valuePart = includeValue ? ` value="${index + 1}"` : '';
          printPage += `\t<${attrType} label="${labelDict[attrType]}${
            index + 1
          }"${extra}${valuePart}>${line}</${attrType}>\n`;
        }
      });

      const updatedText = checkDupeElement(printPage);

      editor.edit((editBuilder) => {
        editBuilder.replace(selection, updatedText);
      });
    }
  } catch (error: any) {
    console.error(error);
    vscode.window.showErrorMessage(`Error: ${error.message}`);
  }
};

function tidyQuestionInput(input: string): [string, string, string, string | null] {
  input = input.trim();
  input = input
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
  input = input.replace(/^(\w?\d+)\.(\d+)/gm, '$1_$2');

  // 2024-01-19 alt update
  // alt label check
  const altMatch = input.split('\n')[0].match(/^\[(.*?)\]/);
  let alt: string | null = null;
  if (altMatch) {
    alt = altMatch[0];
    alt = alt.substring(1, alt.length - 1);
    alt = alt.replace(/\[/g, '(').replace(/\]/g, ')').trim();
    input = input.split('\n').slice(1).join('\n');
  }

  while (input.includes('\n\n')) {
    input = input.replace(/\n\n/g, '\n');
  }

  const labelMatch = input.match(/^([a-zA-Z0-9-_]+)+(\.|:|\)|\s)/);
  const label = labelMatch ? labelMatch[1] : '';
  input = labelMatch ? input.replace(labelMatch[0], '') : input;

  let finalLabel = label;
  if (finalLabel[0].match(/\d/)) {
    finalLabel = 'Q' + finalLabel;
  }

  let title: string;
  if (input.includes('@')) {
    title = input.substring(0, input.indexOf('@'));
  } else {
    const inputIndices: number[] = [];
    const tags = ['<row', '<col', '<choice', '<comment', '<group', '<net', '<exec', '<insert'];

    tags.forEach((tag) => {
      const index = input.indexOf(tag);
      if (index !== -1) {
        inputIndices.push(index);
      }
    });

    if (inputIndices.length === 0) {
      title = input;
    } else {
      const minIndex = Math.min(...inputIndices);
      title = input.substring(0, minIndex);
    }
  }

  input = input.replace(title, '');
  input = input.replace(/\n/g, '\n  ');

  return [input, finalLabel, title, alt];
}

function setQuestionClassNames(output: string): string | null {
  // Custom Button Add
  let classNameTemplate = 'ss:questionClassNames="%s"';
  const rows = output.split('\n').filter((line) => line.includes('<row'));
  const rowCount = rows.length;
  const btnClass = ['sp-custom-btn'];

  // Check for specific tags
  if (!['<insert', '<col', '<choice'].some((tag) => output.includes(tag))) {
    const pattern = />[^<>]+</g;
    const getText = rows
      .map((row) => {
        const match = row.match(pattern);
        return match ? match[0].slice(1, -1).trim() : '';
      })
      .filter((text) => text !== '');

    if (getText.length > 0) {
      const textLengths = getText.map((text) => text.replace(/\s+/g, '').length);
      const maxCount = Math.max(...textLengths);
      const minCount = Math.min(...textLengths);

      if (output.includes('<group')) {
        btnClass.push('btn-cols-2');
      } else {
        if (Math.floor(rowCount / 5) >= 2) {
          if (minCount < 15) {
            const colCount = Math.floor(rowCount / 5);
            btnClass.push(`btn-cols-${colCount}`);
          }
        } else {
          // Add size class based on maximum text length
          if (maxCount <= 15) {
            btnClass.push('btn-mw-300');
          } else if (maxCount <= 30) {
            btnClass.push('btn-mw-500');
          } else if (maxCount <= 40) {
            btnClass.push('btn-mw-700');
          }
        }
      }
    }
  }

  const finalClassName = classNameTemplate.replace('%s', btnClass.join(' '));

  // Reset class name if specific tags are found
  if (['<col', '<choice'].some((tag) => output.includes(tag))) {
    return null;
  }

  return finalClassName;
}

// Helper function: checkInsertCondition
function checkInsertCondition(text: string, attribute: string): boolean {
  const pattern = new RegExp(`<insert[^>]*\\s+as="${attribute}"[^>]*>`);
  return pattern.test(text);
}

// Check Count Attribute
function checkAttr(text: string, attribute: string): boolean {
  // Escaping special characters in attribute to avoid regex issues
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<${escapedAttribute}`, 'g');
  const attrCount = (text.match(regex) || []).length;

  return attrCount > 0;
}

function attrCount(text: string, attribute: string): number {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<${escapedAttribute}`, 'g');
  const attrCount = (text.match(regex) || []).length;

  return attrCount;
}

export function activate(context: vscode.ExtensionContext) {
  // Register the Color Provider
  const colorProvider = vscode.languages.registerColorProvider(
    { language: 'xml', scheme: 'file' },
    new HexColorProvider()
  );
  context.subscriptions.push(colorProvider);

  // --------------------------------- //

  // Short Cut Setting //
  // makeRowCommand (ctrl+1)
  const makeRowCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeRow',
    () => executeCommand(false, 'row') // includeValue: false
  );
  context.subscriptions.push(makeRowCommand);

  // makeRowAutoValueCommand (ctrl+shift+1)
  const makeRowAutoValueCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeRowAutoValue',
    () => executeCommand(true, 'row') // includeValue: true
  );
  context.subscriptions.push(makeRowAutoValueCommand);

  // makeColCommand (ctrl+2)
  const makeColCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeCol',
    () => executeCommand(false, 'col') // includeValue: false
  );
  context.subscriptions.push(makeColCommand);

  // makeColAutoValueCommand (ctrl+shift+2)
  const makeColAutoValueCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeColAutoValue',
    () => executeCommand(true, 'col') // includeValue: true
  );
  context.subscriptions.push(makeColAutoValueCommand);

  // makeChoiceCommand (ctrl+3)
  const makeChoiceCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeChoice',
    () => executeCommand(false, 'choice') // includeValue: false
  );

  context.subscriptions.push(makeChoiceCommand);

  // makeChoiceAutoValueCommand (ctrl+shift+3)
  const makeChoiceAutoValueCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeChoiceAutoValue',
    () => executeCommand(true, 'choice') // includeValue: true
  );

  context.subscriptions.push(makeChoiceAutoValueCommand);

  // makeGroupsCommand (ctrl+5)
  const makeGroupsCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeGroup',
    () => executeCommand(false, 'group') // includeValue: false
  );

  context.subscriptions.push(makeGroupsCommand);

  // makeRowsMatchLabelCommand (ctrl+8)
  const makeRowsMatchLabelCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeRowsMatchLabel',
    () => executeCommand(false, 'row', true) // matchLabel: true
  );
  context.subscriptions.push(makeRowsMatchLabelCommand);

  // makeColsMatchLabelCommand (ctrl+9)
  const makeColsMatchLabelCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeColsMatchLabel',
    () => executeCommand(false, 'col', true) // matchLabel: true
  );
  context.subscriptions.push(makeColsMatchLabelCommand);

  // makeColsMatchValueCommand (ctrl+7)
  const makeColsMatchValueCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeColsMatchValueCommand',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
      }

      const document = editor.document;
      const selections = editor.selections;

      try {
        for (const selection of selections) {
          const selectedText = document.getText(selection);

          if (!selectedText.trim()) {
            vscode.window.showWarningMessage('No text selected.');
            continue;
          }

          // 텍스트 정리 및 분리
          const lines = processText(selectedText);

          let output = '';
          lines.forEach((line) => {
            const match = line.match(/^(\d+)[.)]?\s+(.*)$/); // 숫자, 구분자, 내용 추출
            if (!match) {
              vscode.window.showWarningMessage(`Invalid format in line: ${line}`);
              return;
            }

            const ordinal = match[1].trim(); // 첫 번째 그룹: 번호
            const content = match[2].trim(); // 두 번째 그룹: 내용

            let extra = '';
            if (isOtherSpecify(content)) {
              extra = ' open="1" openSize="25" randomize="0"';
            }

            // 출력 구성
            output += `\t<col label="c${ordinal}" value="${ordinal}"${extra}>${content}</col>\n`;
          });

          // 중복 확인 및 결과 반영
          const updatedText = checkDupeElement(output);

          await editor.edit((editBuilder) => {
            editBuilder.replace(selection, updatedText);
          });
        }
      } catch (error: any) {
        console.error(error);
        vscode.window.showErrorMessage(`An error occurred while processing the command: ${error.message}`);
      }
    }
  );

  context.subscriptions.push(makeColsMatchValueCommand);

  // row/col switching
  const switchElement = vscode.commands.registerCommand('decipher-niq-package.switchElement', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        const selectedText = document.getText(selection).trim();

        if (!selectedText) {
          vscode.window.showWarningMessage('No text selected.');
          continue;
        }

        const lines = selectedText.split('\n');
        const updatedLines = lines.map((line) => {
          if (line.includes('<row')) {
            line = line.replace(/(<|\/)row/g, '$1col');
            line = line.replace(/label="r(\d+)"/g, 'label="c$1"');
          } else if (line.includes('<col')) {
            line = line.replace(/(<|\/)col/g, '$1row');
            line = line.replace(/label="c(\d+)"/g, 'label="r$1"');
          }

          line = line.trim();
          line = `\t${line}`;
          return line;
        });

        const updatedText = updatedLines.join('\n');

        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, updatedText);
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`An error occurred while processing the command: ${error.message}`);
    }
  });

  context.subscriptions.push(switchElement);

  // Switching Code & Label (ctrl+0)
  const changeLabelCode = vscode.commands.registerCommand('decipher-niq-package.changeLabelCode', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        const selectedText = document.getText(selection).trim();

        if (!selectedText) {
          vscode.window.showWarningMessage('No text selected.');
          continue;
        }

        // 줄별로 처리
        const lines = selectedText.split('\n').map((line) => line.trim());
        const filteredLines = lines.filter((line) => line !== '');

        const processedLines = filteredLines.map((line) => {
          const lastTabIndex = line.lastIndexOf('\t');
          const lastSpaceIndex = line.lastIndexOf(' ');

          if (lastTabIndex !== -1) {
            // 탭 기준으로 분리
            const content = line.slice(0, lastTabIndex).trim();
            const code = line.slice(lastTabIndex + 1).trim();
            if (/^\d+$/.test(code)) {
              return `${code}\t${content}`;
            }
          } else if (lastSpaceIndex !== -1) {
            // 공백 기준으로 분리
            const content = line.slice(0, lastSpaceIndex).trim();
            const code = line.slice(lastSpaceIndex + 1).trim();
            if (/^\d+$/.test(code)) {
              return `${code}\t${content}`;
            }
          }

          // 처리할 수 없는 경우 그대로 반환
          return line;
        });

        const outputText = processedLines.join('\n');

        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, outputText);
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`An error occurred while processing the command: ${error.message}`);
    }
  });

  context.subscriptions.push(changeLabelCode);

  // Command: makeStrong
  // Description: Wraps the selected text with <b> tags to make it bold.
  // Shortcut: Ctrl+B
  registerCommand(context, 'decipher-niq-package.makeStrong', (text) => `<b>${text}</b>`);

  // Command: makeAlt
  // Description: Wraps the selected text with <alt> tags for alternative representation.
  // Shortcut: Ctrl+Shift+A
  registerCommand(context, 'decipher-niq-package.makeAlt', (text) => `<alt>${text}</alt>`);

  // Command: makeQname
  // Description: Wraps the selected text with <div class="q-name"> tags and replaces 'x' with '-'.
  // Shortcut: Ctrl+Q
  registerCommand(
    context,
    'decipher-niq-package.makeQname',
    (text) => `<div class="q-name">${text.replace(/x/g, '-')}</div> `
  );

  // Command: makeUnderline
  // Description: Wraps the selected text with <u> tags to underline it.
  // Shortcut: Ctrl+U
  registerCommand(context, 'decipher-niq-package.makeUnderline', (text) => `<u>${text}</u>`);

  // Command: makeStrongColor
  // Description: Wraps the selected text with <span class="f-highlight"> tags for strong highlighting.
  // Shortcut: Ctrl+Shift+B
  registerCommand(
    context,
    'decipher-niq-package.makeStrongColor',
    (text) => `<span class="f-highlight">${text}</span>`
  );

  // Command: makeUnderlineColor
  // Description: Wraps the selected text with <span class="f-highlight"><u></u></span> for colored underline highlighting.
  // Shortcut: Ctrl+Shift+U
  registerCommand(
    context,
    'decipher-niq-package.makeUnderlineColor',
    (text) => `<span class="f-highlight"><u>${text}</u></span>`
  );

  // pipe 로직에 사용되는 case 생성 ctrl+4
  const makeCases = vscode.commands.registerCommand('decipher-niq-package.makeCases', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        let selectedText: any = document.getText(selection).trim();

        // Process the input text
        selectedText = fixUniCode(selectedText);
        const lines = selectedText.split('\n').filter((line: any) => line.trim() !== '');

        let output = '';
        lines.forEach((line: any, index: number) => {
          const cleanedLine = line.replace(/^[a-zA-Z0-9]{1,2}[\.:\)][ \t]+/, '').trim();
          output += `\t<case label="r${index + 1}" cond="">${cleanedLine}</case>\n`;
        });

        // Add the undefined case
        output += `\t<case label="null" cond="1">UNDEFINED</case>\n`;

        // Wrap in <pipe>
        const finalOutput = `<pipe\n  label=""\n  capture="">\n${output}</pipe>`;

        // Replace the selection with the transformed text
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, finalOutput);
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  });

  context.subscriptions.push(makeCases);

  // Command: makeLoopBlock
  // Description: Wraps the selected text in a loop block template.
  // Shortcut: Ctrl+6
  const makeLoopBlock = vscode.commands.registerCommand('decipher-niq-package.makeLoopBlock', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        let selectedText = document.getText(selection).trim();
        // Apply the regex transformation to add loopvar to labels
        selectedText = selectedText.replace(
          /<(radio|checkbox|text|textarea|block|number|float|select|html)(.*) label="([^"]*)"/g,
          `<$1$2 label="$3_[loopvar: label]"`
        );

        // Wrap the transformed text in the loop block template
        const loopBlock = `
<loop
  label=""
  vars="">
  
<block
  label="">

${selectedText}

</block>

<looprow label="" cond=""><loopvar name=""></loopvar></looprow>
</loop>

<suspend/>
`;

        // Replace the selected text with the generated loop block
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, loopBlock);
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`An error occurred while processing the command: ${error.message}`);
    }
  });

  context.subscriptions.push(makeLoopBlock);

  // Command: ctrl+shift+7
  // make rating score cols
  const gridColCommand = vscode.commands.registerCommand('decipher-niq-package.gridCol', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        let selectedText = document.getText(selection).trim();

        if (!selectedText) {
          vscode.window.showWarningMessage('No text selected.');
          continue;
        }

        // Replace and format text
        selectedText = selectedText
          .replace(/\n/g, '') // Remove newlines
          .replace(/\[/g, '**(') // Replace '[' with '**('
          .replace(/\]/g, ')__'); // Replace ']' with ')__'

        const parts = selectedText
          .split('__') // Split by '__'
          .map((part) => part.trim()); // Trim whitespace

        const combined = parts.join(' '); // Join parts with space
        const sections = combined.split('**'); // Split by '**'

        let output = '';

        // Process each section and extract the code and description
        sections.forEach((section) => {
          if (section.includes('(') && section.includes(')')) {
            const ix1 = section.indexOf('(');
            const ix2 = section.indexOf(')');
            const code = section.slice(ix1 + 1, ix2); // Extract code
            const description = section.trim();
            output += `${code}\t${description}\n`;
          }
        });

        // Replace the selection with the processed output
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, output.trim());
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`An error occurred while processing the command: ${error.message}`);
    }
  });

  context.subscriptions.push(gridColCommand);

  // Command: ctrl+shift+l
  // make [loopvar: label]
  const loopLabelCommand = vscode.commands.registerCommand('decipher-niq-package.loopLabel', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        let selectedText = document.getText(selection).trim();

        let outputText = '';
        if (!selectedText) {
          // If no text is selected, default to _[loopvar: label]
          outputText = '_[loopvar: label]';
        } else {
          // Otherwise, use the selected text
          outputText = `[loopvar: ${selectedText}]`;
        }

        // Replace the selected text with the generated loopvar
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, outputText);
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`An error occurred while processing the command: ${error.message}`);
    }
  });

  context.subscriptions.push(loopLabelCommand);

  // Command: ctrl+shift+e
  // change Text to Entity Type
  const changeEntityCommand = vscode.commands.registerCommand('decipher-niq-package.changeEntity', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        let selectedText = document.getText(selection);

        if (!selectedText.trim()) {
          vscode.window.showWarningMessage('No text selected.');
          continue;
        }

        // Escape HTML entities and replace [ ] with 〔 〕
        const transformedText = selectedText
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\[/g, '〔')
          .replace(/\]/g, '〕');

        // Replace the selected text with the transformed text
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, transformedText);
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`An error occurred while processing the command: ${error.message}`);
    }
  });

  context.subscriptions.push(changeEntityCommand);

  // Command: ctrl+p
  // Change Text to [pipe: text]
  const makePipeCommand = vscode.commands.registerCommand('decipher-niq-package.makePipe', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        let selectedText = document.getText(selection).trim();

        if (!selectedText) {
          vscode.window.showWarningMessage('No text selected.');
          continue;
        }

        // Transform the text into [pipe: text] format
        const transformedText = `[pipe: ${selectedText}]`;

        // Replace the selected text with the transformed text
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, transformedText);
        });
      }
    } catch (error: any) {
      console.error('Make pipe failed:', error);
      vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
    }
  });

  context.subscriptions.push(makePipeCommand);

  // Command: ctrl+m
  // Split Context
  const splitContextCommand = vscode.commands.registerCommand('decipher-niq-package.splitContext', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        let selectedText = document.getText(selection);

        if (!selectedText.trim()) {
          vscode.window.showWarningMessage('No text selected.');
          continue;
        }

        // Replace '?' with '?<br/>'
        const transformedText = selectedText.replace(/\?/g, '?<br/>');

        // Replace the selected text with the transformed text
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, transformedText);
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
    }
  });

  context.subscriptions.push(splitContextCommand);

  // Command: ctrl+shift+m
  // Split Comment and to <p> tag
  const splitCommentCommand = vscode.commands.registerCommand('decipher-niq-package.splitComment', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        let selectedText = document.getText(selection);

        if (!selectedText.trim()) {
          vscode.window.showWarningMessage('No text selected.');
          continue;
        }

        // Replace '?' with '?', then split into lines
        const lines = selectedText.replace(/\?/g, '?\n').split('\n');

        // Wrap each line with <p> tags
        const transformedText = lines
          .filter((line) => line.trim().length > 0) // Remove empty lines
          .map((line) => `<p>${line.trim()}</p>`) // Wrap in <p> tags
          .join('\n'); // Join lines with newline

        // Replace the selected text with the transformed text
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, transformedText);
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
    }
  });

  context.subscriptions.push(splitCommentCommand);

  // make looprow tag
  // ctrl+shift+6
  const makeLooprowTagCommand = vscode.commands.registerCommand('decipher-niq-package.makeLooprowTag', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        let selectedText = document.getText(selection).trim();

        if (!selectedText) {
          vscode.window.showWarningMessage('No text selected.');
          continue;
        }

        selectedText = selectedText
          .replace(/\t+/g, ' ') // Clean up tabs
          .replace(/\n +\n/g, '\n\n') // Remove extra spaces between newlines
          .replace(/\n{2,}/g, '\n'); // Remove consecutive newlines

        const lines = selectedText.split('\n').map((line) => line.trim());
        let output = '';

        lines.forEach((line) => {
          const match = line.match(/^(\d+)\s+(.*)$/); // Match the format "1 Text here"
          if (match) {
            const ordinal = match[1].trim(); // Extract the number
            const content = match[2].trim(); // Extract the remaining text
            output += `  <looprow label="${ordinal}"><loopvar name="var">${content}</loopvar></looprow>\n`;
          }
        });

        // Replace the selected text with the generated content
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, output);
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
    }
  });

  context.subscriptions.push(makeLooprowTagCommand);

  // looprow macro shortcut
  // ctrl+alt+6
  const looprowMacroCommand = vscode.commands.registerCommand('decipher-niq-package.looprowMacro', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    try {
      for (const selection of selections) {
        let selectedText = document.getText(selection).trim();

        if (!selectedText) {
          vscode.window.showWarningMessage('No text selected.');
          continue;
        }

        if (selectedText.includes('\n')) {
          vscode.window.showErrorMessage(`Invalid input method: ${selectedText}`);
          return;
        }

        const base = selectedText.split(' ').pop() || '';
        const rawCodes = selectedText.replace(base, '').trim();
        const ranges = rawCodes.split(',');

        let codes: (string | number)[] = [];

        ranges.forEach((range) => {
          if (range.includes('-')) {
            const [start, end] = range.split('-').map((num) => parseInt(num.trim(), 10));
            for (let i = start; i <= end; i++) {
              codes.push(i);
            }
          } else {
            codes.push(range.trim());
          }
        });

        let output = '';

        codes.forEach((code) => {
          let loopRowText = '';
          if (typeof code === 'string' && code.toLowerCase().includes('oe')) {
            code = code.toLowerCase().replace(/oe/g, '').trim();
            loopRowText = `\${${base}.r${code}.open}`;
          } else {
            loopRowText = `\${${base}.r${code}.text}`;
          }
          output += `  <looprow label="${code}"><loopvar name="var">${loopRowText}</loopvar></looprow>\n`;
        });

        // Replace the selected text with the generated content
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, output);
        });
      }
    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
    }
  });

  context.subscriptions.push(looprowMacroCommand);

  // make rows with group (match value)
  // ctrl+shift+g
  const makeRowsMatchValuesGroupCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeRowsMatchValuesGroup',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
      }

      const document = editor.document;
      const selections = editor.selections;

      try {
        for (const selection of selections) {
          let selectedText = document.getText(selection).trim();

          if (!selectedText) {
            vscode.window.showWarningMessage('No text selected.');
            continue;
          }

          const groupSplit = selectedText.split('\n').filter((line) => line.trim() !== '');
          let groupCounter = 1;
          let otherGroup = 98;
          let output = '';

          const groupLines = groupSplit.map((line, index) => {
            const chk = line.replace(/\t\t/g, ' ').replace(/\t/g, ' ').indexOf(' ');
            const groupChk = line.slice(0, chk).trim();

            if (!/^\d+$/.test(groupChk)) {
              const lowerLine = line.replace(/\s/g, '').toLowerCase();
              const otherText = ['기타', '없음', 'other', 'others', 'none'];
              let extra = '';
              let groupLabel = '';

              if (otherText.includes(lowerLine)) {
                extra = ' randomize="0"';
                groupLabel = otherGroup.toString();
                otherGroup++;
              } else {
                groupLabel = groupCounter.toString();
                groupCounter++;
              }

              return `<group label="g${groupLabel}"${extra}>${line.trim()}</group>`;
            }

            return line;
          });

          const groupDict = groupLines.reduce((acc, line, index) => {
            if (line.startsWith('<group')) {
              acc.push({ tag: line, content: [] });
            } else if (acc.length) {
              acc[acc.length - 1].content.push(line);
            }
            return acc;
          }, [] as { tag: string; content: string[] }[]);

          for (const group of groupDict) {
            const groupTag = group.tag;
            const groupLabel = groupTag.match(/label="([^"]+)"/)?.[1] || '';
            const rows = group.content.map((line) => {
              const parts = line.trim().split(/\s(.+)/);
              const ordinal = parts[0]?.replace(/[.)]+$/, '').trim();
              const content = parts[1]?.trim() || '';
              let extra = '';

              if (
                ['기타', 'other', 'others'].some((word) => content.toLowerCase().includes(word)) &&
                ['구체적', '자세히', 'specify', 'specific'].some((word) => content.toLowerCase().includes(word))
              ) {
                extra = ' open="1" openSize="25" randomize="0"';
              } else if (['모름', '없음', 'none'].some((word) => content.toLowerCase().includes(word))) {
                extra = ' exclusive="1" randomize="0"';
              }

              return `  <row label="r${ordinal}" groups="${groupLabel}" value="${ordinal}"${extra}>${content}</row>`;
            });

            output += `${groupTag}\n${rows.join('\n')}\n`;
          }

          // Replace the selected text with the generated content
          await editor.edit((editBuilder) => {
            editBuilder.replace(selection, output);
          });
        }
      } catch (error: any) {
        console.error(error);
        vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
      }
    }
  );

  context.subscriptions.push(makeRowsMatchValuesGroupCommand);

  // make Cols with Group Tag
  // ctrl+shift+8
  const makeColsWithGroupCommand = vscode.commands.registerCommand(
    'decipher-niq-package.makeColsWithGroup',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
      }

      const document = editor.document;
      const selections = editor.selections;

      try {
        for (const selection of selections) {
          let selectedText = document.getText(selection).trim();

          if (!selectedText) {
            vscode.window.showWarningMessage('No text selected.');
            continue;
          }

          selectedText = selectedText
            .replace(/\t+/g, ' ') // Clean up tabs
            .replace(/\n +\n/g, '\n\n') // Remove extra spaces between newlines
            .replace(/\n{2,}/g, '\n'); // Remove consecutive newlines

          const lines = selectedText.split('\n').map((line) => line.trim());
          let output = '';
          let groupText = '';

          // Check if the first line is a group label or part of columns
          const groupCheck = lines[0].split(/\s/, 1)[0];
          if (!/^\d+$/.test(groupCheck)) {
            groupText = lines[0];
            lines.shift(); // Remove the first line from the input
          }

          output += `  <group label="g1">${groupText}</group>\n`;

          // Process each line to create <col> tags
          lines.forEach((line) => {
            const parts = line.split(/\s(.+)/); // Split into two parts: ordinal and content
            const ordinal = parts[0]?.replace(/[.)]+$/, '').trim();
            const content = parts[1]?.trim() || '';
            let extra = '';

            // Check for 'other' or '기타' conditions
            if (isOtherSpecify(content)) {
              extra = ' open="1" openSize="25" randomize="0"';
            }

            output += `  <col label="c${ordinal}" groups="g1" value="${ordinal}"${extra}>${content}</col>\n`;
          });

          // Replace the selected text with the generated content
          await editor.edit((editBuilder) => {
            editBuilder.replace(selection, output);
          });
        }
      } catch (error: any) {
        console.error(error);
        vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
      }
    }
  );

  context.subscriptions.push(makeColsWithGroupCommand);

  // make Conjoint Attributes
  // ctrl+shift+f7
  const makeConjointAttrs = vscode.commands.registerCommand('decipher-niq-package.makeConjointAttrs', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);
        const lineSplit = input
          .split('\n')
          .filter((line) => line.trim() !== '')
          .map((line) => line.replace('\t', ' '));

        const legends: Array<[number, string]> = [];
        const levels: Array<[number, number, string]> = [];

        let legendCount = 0;
        lineSplit.forEach((line) => {
          const parts = line.split(' ');
          if (!parts[0].match(/^\d+$/)) {
            legendCount++;
            legends.push([legendCount, line]);
          } else {
            levels.push([legendCount, parseInt(parts[0], 10), parts.slice(1).join(' ').trim()]);
          }
        });

        let output = '<res label="NoneText">None</res>\n';
        output += '<res label="TopText">Concept</res>\n';
        output += '<res label="rowText">Select</res>\n';

        legends.forEach(([legendCode, legendText]) => {
          output += `<res label="DCM_legend${legendCode}">${legendText.trim().replace('&', '&amp;')}</res>\n`;
          levels
            .filter(([lc]) => lc === legendCode)
            .forEach(([_, levelCode, levelText]) => {
              output += `<res label="DCM_att${legendCode}_level${levelCode}">${levelText.replace(
                '&',
                '&amp;'
              )}</res>\n`;
            });
        });

        edit.replace(document.uri, selection, output);
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  });

  context.subscriptions.push(makeConjointAttrs);

  // make Maxdiff Attributes
  // ctrl+shift+f8
  const makeMaxdiffAttrs = vscode.commands.registerCommand('decipher-niq-package.makeMaxdiffAttrs', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);
        const lineSplit = input
          .split('\n')
          .filter((line) => line.trim() !== '')
          .map((line) => line.trim().replace('\t', ' ').replace('&', '&amp;'));

        let output = '';
        lineSplit.forEach((line) => {
          const parts = line.split(' ');
          const attrCode = parts[0];
          const attrText = parts.slice(1).join(' ');
          output += `<res label="MD_item${attrCode}">${attrText}</res>\n`;
        });

        edit.replace(document.uri, selection, output);
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  });

  context.subscriptions.push(makeMaxdiffAttrs);

  // make Quota Cells
  // ctrl+shift+q
  const makeQuotaCells = vscode.commands.registerCommand('decipher-niq-package.makeQuotaCells', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('활성화된 에디터가 없습니다.');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    editor.edit((editBuilder) => {
      try {
        selections.forEach((selection) => {
          const selectedText = document.getText(selection);
          const lines = selectedText.split('\n').filter((line) => line.trim() !== '');

          // Split lines by tabs and build the columns dictionary
          const columns: { [key: number]: string[] } = {};

          lines.forEach((line) => {
            const parts = line.split('\t');
            parts.forEach((part, index) => {
              if (!columns[index]) {
                columns[index] = [];
              }
              const trimmed = part.trim();
              if (trimmed !== '') {
                // 빈 문자열을 제외하지 않고 추가
                columns[index].push(trimmed);
              }
            });
          });

          // 정렬된 열 배열 생성
          const sortedColumns = Object.keys(columns)
            .map((key) => parseInt(key))
            .sort((a, b) => a - b)
            .map((key) => columns[key]);

          // 데카르트 곱 계산
          const product = cartesianProduct(sortedColumns);

          // 결과 문자열 생성
          let printPage = '';
          product.forEach((combo) => {
            printPage += `${combo.join('\t')}\tinf\n`;
          });

          // 선택된 텍스트를 생성된 결과로 대체
          editBuilder.replace(selection, printPage);
        });
      } catch (error) {
        console.error(error);
        vscode.window.showErrorMessage(`makeQuotaCells 실행 중 오류 발생: ${error}`);
      }
    });
  });

  context.subscriptions.push(makeQuotaCells);

  // Make Radio Question
  // ctrl+r
  const makeRadio = vscode.commands.registerCommand('decipher-niq-package.makeRadio', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);
        const [processedInput, label, title, alt] = tidyQuestionInput(input);

        let printPage = '';
        let classNames = setQuestionClassNames(processedInput) || '';
        classNames = classNames ? `\n  ${classNames}` : '';

        // Check for custom card condition
        if (
          (checkAttr(processedInput, 'row') && checkAttr(processedInput, 'col')) ||
          (checkInsertCondition(processedInput, 'cols') && checkAttr(processedInput, 'row'))
        ) {
          classNames = '\n  surveyDisplay="mobile"\n  ss:questionClassNames="sp-custom-btn btn-cols-1 sp-custom-card"';
        }

        // Default alt label
        const altLabel = alt ? `\n  <alt>${alt}</alt>` : '';

        // If input is empty
        if (processedInput.trim() === '') {
          printPage = `
<radio 
  label="${label.trim()}"
  optional="1"
  where="execute">${altLabel}
  <title>(HIDDEN) ${title.trim()}</title>
  <row label="r0" value="0">False</row>
  <row label="r1" value="1">True</row>
</radio>
<suspend/>`;
          edit.replace(document.uri, selection, printPage);
          continue;
        }

        // Handle <comment> tag if not present
        let comment = processedInput.includes('<comment>') ? '' : '<comment></comment>';

        // Compose the final radio question
        printPage = `
<radio
  label="${label.trim()}"${classNames}>${altLabel}
  <title><div class="q-name">${label.trim().replace(/x/g, '-')}</div> ${title.trim()}</title>
  ${comment}
  ${processedInput}
</radio>
<suspend/>`;

        edit.replace(document.uri, selection, printPage);
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Make Radio Question failed: ${error.message}`);
    }
  });

  context.subscriptions.push(makeRadio);

  // Make Rating Question
  // ctrl+shift+r
  const makeRating = vscode.commands.registerCommand('decipher-niq-package.makeRating', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);
        const [processedInput, label, title, alt] = tidyQuestionInput(input);

        let printPage = '';
        const altLabel = alt ? `\n  <alt>${alt}</alt>` : '';
        let shuffle = '';
        let style = '\n  uses="atmtable.6"';
        let comment = processedInput.includes('<comment>') ? '' : '<comment></comment>';
        let customRate =
          '\n  <style copy="custom_rating" arg:qmode="rating" arg:autoContinue="false" arg:autoNumber="true" arg:btnDirection="row" arg:leftText="" arg:rightText="" arg:showArrow="false" arg:showGroup="true" name="question.after"/>';

        // Determine shuffle logic
        if (checkAttr(processedInput, 'row') || checkAttr(processedInput, 'insert')) {
          shuffle = '\n  shuffle="rows"';
        }

        if (!checkAttr(processedInput, 'row') && !checkAttr(processedInput, 'insert')) {
          customRate = '';
        }

        // Compose the final rating question
        printPage = `
<radio
  label="${label.trim()}"${shuffle}${style}
  type="rating">${altLabel}
  <title><div class="q-name">${label.trim().replace(/x/g, '-')}</div> ${title.trim()}</title>${customRate}
  ${comment}
  ${processedInput}
</radio>
<suspend/>`;

        edit.replace(document.uri, selection, printPage.trim());
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Make Rating Question failed: ${error.message}`);
    }
  });

  context.subscriptions.push(makeRating);

  // Make Checkbox Question
  // ctrl+shift+c
  const makeCheckbox = vscode.commands.registerCommand('decipher-niq-package.makeCheckbox', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);
        const [processedInput, label, title, alt] = tidyQuestionInput(input);

        let printPage = '';
        const altLabel = alt ? `\n  <alt>${alt}</alt>` : '';
        let class_name = setQuestionClassNames(processedInput);
        class_name = class_name ? `\n  ${class_name}` : '';

        if (
          (checkAttr(processedInput, 'row') && checkAttr(processedInput, 'col')) ||
          (checkInsertCondition(processedInput, 'cols') && checkAttr(processedInput, 'row')) ||
          (attrCount(processedInput, 'insert') >= 2 &&
            checkAttr(processedInput, 'insert') &&
            checkInsertCondition(processedInput, 'cols'))
        ) {
          class_name = `\n  surveyDisplay="mobile"\n  ss:questionClassNames="sp-custom-btn btn-cols-1 sp-custom-card"`;
        }

        const notaArray = [
          '>None of the above',
          '>None of these',
          '>None of the Above',
          '>None of These',
          '이 중 없음',
        ];
        const noAns = '<noanswer';
        const updatedInput = processedInput
          .split('\n')
          .map((line) => {
            let updatedLine = line.trim();
            notaArray.forEach((nota) => {
              if (line.includes(nota) && !line.includes(noAns)) {
                updatedLine = line.replace(nota, ` exclusive="1" randomize="0"${nota}`);
              }
            });
            return updatedLine;
          })
          .join('\n  ');

        const comment = processedInput.includes('<comment>') ? '' : '<comment></comment>';

        if (!processedInput.includes('<comment>')) {
          printPage = `
<checkbox
  label="${label.trim()}"
  atleast="1"${class_name}>${altLabel}
  <title><div class="q-name">${label.trim().replace(/x/g, '-')}</div> ${title.trim()}</title>
  ${comment}
  ${updatedInput}
</checkbox>
<suspend/>`;
        } else {
          printPage = `
<checkbox
  label="${label.trim()}"
  atleast="1"${class_name}>${altLabel}
  <title><div class="q-name">${label.trim().replace(/x/g, '-')}</div> ${title.trim()}</title>
  ${updatedInput}
</checkbox>
<suspend/>`;
        }

        edit.replace(document.uri, selection, printPage.trim());
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Make Checkbox Question failed: ${error.message}`);
    }
  });

  context.subscriptions.push(makeCheckbox);

  // Make Select Question
  // ctrl+shift+s
  const makeSelect = vscode.commands.registerCommand('decipher-niq-package.makeSelect', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);
        const [processedInput, label, title, alt] = tidyQuestionInput(input);

        const altLabel = alt ? `\n  <alt>${alt}</alt>` : '';
        const comment = processedInput.includes('<comment>') ? '' : '<comment></comment>';

        const printPage = `
<select
  label="${label.trim()}"
  optional="0">${altLabel}
  <title><div class="q-name">${label.trim().replace(/x/g, '-')}</div> ${title.trim()}</title>
  ${comment}
  ${processedInput}
</select>
<suspend/>`;

        edit.replace(document.uri, selection, printPage.trim());
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Make Select Question failed: ${error.message}`);
    }
  });

  context.subscriptions.push(makeSelect);

  // Make TextArea Question
  // ctrl+shift+t
  const makeTextArea = vscode.commands.registerCommand('decipher-niq-package.makeTextArea', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);
        const [processedInput, label, title, alt] = tidyQuestionInput(input);

        const altLabel = alt ? `\n  <alt>${alt}</alt>` : '';
        const comment = processedInput.includes('<comment>') ? '' : '<comment></comment>';

        const printPage = `
<textarea
  label="${label.trim()}"
  optional="0">${altLabel}
  <title><div class="q-name">${label.trim().replace(/x/g, '-')}</div> ${title.trim()}</title>
  ${comment}
  ${processedInput}
</textarea>
<suspend/>`;

        edit.replace(document.uri, selection, printPage.trim());
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Make TextArea Question failed: ${error.message}`);
    }
  });

  context.subscriptions.push(makeTextArea);

  // Make Text Question
  // ctrl+t
  const makeText = vscode.commands.registerCommand('decipher-niq-package.makeText', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);
        const [processedInput, label, title, alt] = tidyQuestionInput(input);

        const altLabel = alt ? `\n  <alt>${alt}</alt>` : '';
        const comment = processedInput.includes('<comment>') ? '' : '<comment></comment>';

        const printPage = `
<text
  label="${label.trim()}"
  size="40"
  optional="0">${altLabel}
  <title><div class="q-name">${label.trim().replace(/x/g, '-')}</div> ${title.trim()}</title>
  ${comment}
  ${processedInput}
</text>
<suspend/>`;

        edit.replace(document.uri, selection, printPage.trim());
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Make Text Question failed: ${error.message}`);
    }
  });

  context.subscriptions.push(makeText);

  // Make Number Question
  // ctrl+n
  const makeNumber = vscode.commands.registerCommand('decipher-niq-package.makeNumber', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);
        const [processedInput, label, title, alt] = tidyQuestionInput(input);

        const altLabel = alt ? `\n  <alt>${alt}</alt>` : '';
        const comment = processedInput.includes('<comment>') ? '' : '<comment></comment>';

        const printPage = `
<number
  label="${label.trim()}"
  size="3"
  optional="0">${altLabel}
  <title><div class="q-name">${label.trim().replace(/x/g, '-')}</div> ${title.trim()}</title>
  ${comment}
  ${processedInput}
</number>
<suspend/>`;

        edit.replace(document.uri, selection, printPage.trim());
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Make Number Question failed: ${error.message}`);
    }
  });

  context.subscriptions.push(makeNumber);

  // Make Float Question
  // ctrl+shift+f
  const makeFloat = vscode.commands.registerCommand('decipher-niq-package.makeFloat', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);
        const [processedInput, label, title, alt] = tidyQuestionInput(input);

        const altLabel = alt ? `\n  <alt>${alt}</alt>` : '';
        const comment = processedInput.includes('<comment>') ? '' : '<comment></comment>';

        const printPage = `
<float
  label="${label.trim()}"
  size="3"
  optional="0">${altLabel}
  <title><div class="q-name">${label.trim().replace(/x/g, '-')}</div> ${title.trim()}</title>
  ${comment}
  ${processedInput}
</float>
<suspend/>`;

        edit.replace(document.uri, selection, printPage.trim());
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Make Float Question failed: ${error.message}`);
    }
  });

  context.subscriptions.push(makeFloat);

  // Make Video Question
  // ctrl+shift+v
  const makeVideo = vscode.commands.registerCommand('decipher-niq-package.makeVideo', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const selection of selections) {
        const input = document.getText(selection);

        let title = '';
        let videoInput = input;

        if (input.includes('\n')) {
          const findn = input.indexOf('\n');
          title = input.substring(findn).trim();
          videoInput = input.substring(0, findn).trim();
        }

        const [_, label, videoID] = tidyQuestionInput(videoInput);

        const printPage = `
<text 
  label="${label.trim()}"
  optional="0"
  size="25"
  sst="0"
  uses="videoplayer.1"
  videoplayer:player_id="SybkoGSJb"
  videoplayer:video_id="${videoID.trim()}">
  <title>${title}</title>
</text>
<suspend/>`;

        edit.replace(document.uri, selection, printPage.trim());
      }

      await vscode.workspace.applyEdit(edit);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Make Video Question failed: ${error.message}`);
    }
  });

  context.subscriptions.push(makeVideo);

  // Make Rank Columns
  const makeRankColumns = vscode.commands.registerCommand('decipher-niq-package.makeRankColumns', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);

    const match = text.match(/^(rk|erk)(\d+)$/);
    if (!match) {
      vscode.window.showErrorMessage('Selected text is not in the correct format (rk or erk followed by a number).');
      return;
    }

    const prefix = match[1];
    const count = parseInt(match[2], 10);

    if (isNaN(count) || count <= 0) {
      vscode.window.showErrorMessage('The number after rk/erk must be a positive integer.');
      return;
    }

    const generateColTag = (label: string, content: string) => `<col label="${label}">${content}</col>`;
    let result = '';

    for (let i = 1; i <= count; i++) {
      const label = `c${i}`;
      let content = '';

      if (prefix === 'rk') {
        content = `${i}순위`;
      } else if (prefix === 'erk') {
        const suffix = i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th';
        content = `${i}${suffix}`;
      }

      result += generateColTag(label, content) + '\n';
    }

    editor.edit((editBuilder) => {
      editBuilder.replace(selection, result.trim());
    });
  });

  context.subscriptions.push(makeRankColumns);
}

class HexColorProvider implements vscode.DocumentColorProvider {
  // Detect HEX codes in the document
  public provideDocumentColors(document: vscode.TextDocument): vscode.ColorInformation[] {
    const hexColorRegex = /#[0-9a-fA-F]{6}\b/g; // Matches HEX codes
    const text = document.getText();
    const matches = [...text.matchAll(hexColorRegex)];

    return matches.map((match) => {
      const start = document.positionAt(match.index!);
      const end = document.positionAt(match.index! + match[0].length);
      const color = this.hexToColor(match[0]);
      return new vscode.ColorInformation(new vscode.Range(start, end), color);
    });
  }

  // Generate HEX code for the selected color
  public provideColorPresentations(color: vscode.Color, context: { range: vscode.Range }): vscode.ColorPresentation[] {
    const hex = this.colorToHex(color);
    return [new vscode.ColorPresentation(hex)];
  }

  // Convert HEX string to vscode.Color
  private hexToColor(hex: string): vscode.Color {
    const r = parseInt(hex.substr(1, 2), 16) / 255;
    const g = parseInt(hex.substr(3, 2), 16) / 255;
    const b = parseInt(hex.substr(5, 2), 16) / 255;
    return new vscode.Color(r, g, b, 1); // Alpha is set to 1 (fully opaque)
  }

  // Convert vscode.Color to HEX string
  private colorToHex(color: vscode.Color): string {
    const r = Math.round(color.red * 255)
      .toString(16)
      .padStart(2, '0');
    const g = Math.round(color.green * 255)
      .toString(16)
      .padStart(2, '0');
    const b = Math.round(color.blue * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${r}${g}${b}`;
  }
}

export function deactivate() {}
