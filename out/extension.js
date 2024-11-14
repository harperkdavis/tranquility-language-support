"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
function activate(context) {
    const builtinFunctions = [
        {
            name: 'alloc',
            args: ['n'],
            docs: 'This function allocates a block of memory with `n` locations and returns the address of the first location.',
        },
        {
            name: 'button',
            args: ['label', 'fun'],
            docs: 'Create a button on the HTML page with the label given by the first argument. When the button is pushed, the Tranquility function identified by the second argument is called. This function returns an identifier for the button that can be used in later to `buttonlabel`.',
        },
        {
            name: 'buttonlabel',
            args: ['b', 'label'],
            docs: ' Set the label on the button identified by the first argument to the string passed as the second argument. The first argument should be a previously saved return value from a call to `button`.',
        },
        {
            name: 'free',
            args: ['p'],
            docs: 'Returns the previously allocated memory block to the free list. The argument is the memory address returned by the earlier call to `alloc`. (Currently unimplemented)',
        },
        {
            name: 'html',
            args: ['s'],
            docs: 'Send the HTML code in the argument string to the HTML window for Tranquility.',
        },
        {
            name: 'i2s',
            args: ['str', 'n'],
            docs: 'Produce a string that contains the decimal (base-10) representation of the integer value passed as the second argument. The first argument should be the address of a block of memory large enough to contain the string.',
        },
        {
            name: 'iprint',
            args: ['n'],
            docs: 'Print the integer in decimal in the standard output window.',
        },
        {
            name: 'iread',
            args: ['s'],
            docs: ' Prompt at the command line or pop up a dialog in the browser, using the argument string as the prompt. The numeric value of the entered integer is returned from the function.',
        },
        {
            name: 'makeimg',
            args: [],
            docs: 'This function creates an image without source specified. Its return value can be used to later specify the source of the image through calls to `setimage`.',
        },
        {
            name: 'makelabel',
            args: ['s'],
            docs: 'Create a label setting its contents to the string passed as an argument. It returns an integer label identifier that can be passed to `setlabel` to change the text in the label.',
        },
        {
            name: 'maketable',
            args: ['r', 'c', 'f'],
            docs: 'Create a table with `r` rows and `c` columns, returning an integer table identifier. The function `f` is called each time the user clicks on a cell of the table. It is passed the row and column as arugments. The return value can be used in later calls to `setcell` and `setcellcolor` to identify which table is being affected.'
        },
        {
            name: 'random',
            args: ['n'],
            docs: 'Returns a random number in the range [0, `n`).',
        },
        {
            name: 'setcell',
            args: ['t', 'r', 'c', 's'],
            docs: 'Set the contents of the cell at row `r` and column `c` of table `t` to the string `s`. The first argument should be a value returned from `maketable`.',
        },
        {
            name: 'setcellcolor',
            args: ['t', 'r', 'c', 'color'],
            docs: 'Set the background color of the cell at row `r` and column `c` of table `t` to the color named by the string `color`. The first argument should be a value returned from `maketable`.',
        },
        {
            name: 'setimg',
            args: ['n', 'src'],
            docs: 'Set the source property of an image. The return value from the earlier `makeimg` call should be provided as the first argument. The second argument should be the string specifying the image source.',
        },
        {
            name: 'setlabel',
            args: ['n', 's'],
            docs: 'Changes the text in the label identified by the first argument (a value returned from an earlier call to `makelabel`) to the string specified by the second argument.',
        },
        {
            name: 'sprint',
            args: ['s'],
            docs: 'Print the string whose address is passed as the argument on the standard output.',
        },
        {
            name: 'sread',
            args: ['s', 'p'],
            docs: ' Prompt at the command line or pop up a dialog in the browser, using the argument string as the prompt. The input string is copied into the memory starting at the address passed as the first argument.',
        },
        {
            name: 'stoptimer',
            args: ['n'],
            docs: 'Cancels a previously created timer that has not yet fired. The argument passed should be the value returned from an earlier call to `timer`.',
        },
        {
            name: 'timer',
            args: ['ms', 'fun'],
            docs: 'This function creates a timer that will fire `ms` milliseconds after it is created. When it fires, it will call the function identified in the second argument. The function returns an integer identifier that can be used to cancel the timer with a call to `stoptimer`.'
        }
    ];
    const keywords = {
        'if': 'if ${1} {${0}}',
        'var': null,
        'loop': 'loop {${0}}',
        'until': null,
        'else': null,
        'fun': 'fun ${1}(${2}) {${0}}',
        'return': null,
    };
    const examine = (document) => {
        const lines = document.getText().split('\n');
        const functions = [...builtinFunctions];
        const globals = [];
        let currentFunction = null;
        let braceDepth = 0;
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i].trim();
            if (line.includes('{')) {
                braceDepth += 1;
            }
            if (line.includes('}')) {
                braceDepth -= 1;
                if (braceDepth <= 0) {
                    braceDepth = 0;
                    if (currentFunction) {
                        currentFunction.lineEnd = i;
                        functions.push(currentFunction);
                        currentFunction = null;
                    }
                }
            }
            if (line.startsWith('var')) {
                const split = line.split(' ').map(t => t.replace(/,/g, '').trim()).filter(t => t.length);
                if (split.length < 2) {
                    continue;
                }
                for (const variable of split.slice(1)) {
                    console.log(variable);
                    if (braceDepth === 0) {
                        globals.push({
                            name: variable,
                            level: 'global',
                        });
                    }
                    else if (currentFunction !== null) { // should always be true
                        currentFunction.vars?.push({
                            name: variable,
                            level: 'var',
                        });
                    }
                }
            }
            else if (line.startsWith('fun')) { // function declaration
                // first, look for doc comments above the declaration.
                let commentLineIndex = i - 1;
                let comment = '';
                while (commentLineIndex >= 0) {
                    const commentLine = lines[commentLineIndex].trim();
                    console.log(commentLine);
                    if (!commentLine.startsWith('#') && commentLine.length > 0) {
                        break;
                    }
                    if (commentLine.length > 0) {
                        const formattedLine = commentLine.substring(1).trim();
                        comment = comment.length ? formattedLine : `${formattedLine}\n${comment}`;
                    }
                    commentLineIndex -= 1;
                }
                // next, parse out the function name.
                const argSplit = line.split('(');
                if (argSplit.length !== 2) {
                    continue;
                }
                const nameSplit = argSplit[0].split(' ').map(t => t.trim()).filter(t => t.length);
                if (nameSplit.length !== 2) {
                    continue;
                }
                const name = nameSplit[1];
                const args = argSplit[1].split(' ').map(t => t.replace(/,|\(|\)|{/, '').trim()).filter(t => t.length);
                currentFunction = {
                    name,
                    args,
                    lineStart: i,
                    docs: comment,
                    params: args.map(a => ({ name: a, level: 'param' })),
                    vars: [],
                };
            }
        }
        return { functions, globals };
    };
    const availableVariables = (exam, position) => {
        const func = exam.functions.find(f => (f.lineStart !== undefined && f.lineEnd !== undefined) && position.line > f.lineStart && position.line < f.lineEnd);
        if (func) {
            return [...exam.globals, ...(func.params || []), ...(func.vars || [])];
        }
        else {
            return exam.globals;
        }
    };
    const formatFunction = (fn) => {
        return `${fn.name}(${fn.args.map(a => `${a}`).join(', ')})`;
    };
    const functionDocs = (fn) => {
        return `### \`${fn.name} (${fn.args.join(', ')})\`${fn.lineStart === undefined ? ' (built-in)' : ''}${fn.docs.length ? `\n\n${fn.docs}` : ''}`;
    };
    const provider1 = vscode.languages.registerCompletionItemProvider('tranquility', {
        provideCompletionItems(document, position, _token, _context) {
            const exam = examine(document);
            const variables = availableVariables(exam, position);
            const completionItems = [];
            console.log(exam, variables);
            const currentLine = document.lineAt(position).text;
            if (!currentLine.includes(':') && !currentLine.trim().startsWith('var')) {
                for (const variable of variables) { // create assignment
                    const completion = new vscode.CompletionItem(`${variable.name} : `);
                    completion.kind = vscode.CompletionItemKind.Variable;
                    completionItems.push(completion);
                }
            }
            const varCompletion = variables.map(v => v.name).join(',');
            if (!currentLine.trim().startsWith('fun')) {
                for (const func of exam.functions) {
                    const completion = new vscode.CompletionItem(formatFunction(func));
                    completion.insertText = new vscode.SnippetString(`${func.name}(${func.args.map((n, i) => n === 's' ? `"\${${i + 1}}"` : `.\${${i + 1}|${n},${varCompletion}|}`).join(', ')})`);
                    completion.kind = func.lineStart === undefined ? vscode.CompletionItemKind.Function : vscode.CompletionItemKind.Method;
                    if (func.docs.length) {
                        completion.documentation = new vscode.MarkdownString(functionDocs(func));
                    }
                    completionItems.push(completion);
                }
            }
            for (const keyword in keywords) {
                const completion = new vscode.CompletionItem(keyword);
                if (keywords[keyword] === null) {
                    completion.insertText = keyword + ' ';
                }
                else {
                    completion.insertText = new vscode.SnippetString(keywords[keyword]);
                }
                completion.kind = vscode.CompletionItemKind.Keyword;
                completionItems.push(completion);
            }
            // return all completion items as array
            return completionItems;
        }
    });
    const provider2 = vscode.languages.registerCompletionItemProvider('tranquility', {
        provideCompletionItems(document, position) {
            const exam = examine(document);
            const variables = availableVariables(exam, position);
            const completionItems = [];
            for (const variable of variables) {
                const completion = new vscode.CompletionItem(`.${variable.name}`);
                completion.insertText = variable.name;
                completion.kind = vscode.CompletionItemKind.Variable;
                completion.documentation = new vscode.MarkdownString('To look inside that memory location and get the value stored there, we have an operator that\'s denoted by the dot (`.`) character. So in Tranquility, the expression `n` evaluates to be the memory address associated with the name `n`, and the expression `.n` evaluates to be the data stored in the memory location named `n`.');
                completionItems.push(completion);
            }
            return completionItems;
        }
    }, '.', ':' // triggered whenever a '.' is being typed
    );
    const provider3 = vscode.languages.registerHoverProvider('tranquility', {
        provideHover(document, position) {
            const exam = examine(document);
            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);
            const fn = exam.functions.find(f => f.name == word);
            if (fn) {
                return new vscode.Hover(new vscode.MarkdownString(functionDocs(fn)));
            }
            else {
                return null;
            }
        },
    });
    context.subscriptions.push(provider1, provider2, provider3);
}
//# sourceMappingURL=extension.js.map