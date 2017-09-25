/*!
 * Blade | Directive handlers
 *
 * @author Nathan Thomas
 */

/**
 * Used for creating for, foreach and while loops
 * as they share similar wrappings and 
 * loop helpers.
 */
function loopling (file, token) {
    let matches = file.content.match(new RegExp(`@${token} ?\\((.*).*?\\)`, 'g'));

    if (!matches) {
        return file;
    }

    matches.forEach(match => {
        let updates = match;
        let varname = match.match(new RegExp(`@${token} ?\\((.*?) as (.*?)\\)`));

        if (!varname) {
            return;
        }

        updates = updates.replace(new RegExp(`@${token} ?\\(.*as (.*?)\\)`), `<?php ${token} (${varname[1]} as $1) : ?>`);

        file.content = file.content.replace(match, updates);
    });

    file.content = file.content.replace(new RegExp(`@end${token}`, 'g'), `<?php end${token}; ?>`);

    return file;
}

module.exports = {
    
    /**
     * Replace with PHP break tag.
     * This is used in loops such
     * as foreach, for and while.
     */
    break: file => {
        file.content = file.content
            .replace(/@break ?\((.*).*?\)/g, '<?php if ($1) { break; } ?>')
            .replace(/@break/g, '<?php break; ?>');

        return file;
    },

    /**
     * This creates a wrapping output buffer that includes the 
     * requested file, uses slot defined values as properties 
     * to an object internal to the wrapper then uses the 
     * remaining contents as the body of the component.
     */
    component: file => {
        let matches = file.content.match(/@component([\s\S]+?)@endcomponent/g);

        if (!matches) {
            return file;
        }

        matches.forEach((match, a, b) => {
            let replacements = [];
            let component = match.match(/@component ?\((.*?)\)([\s\S]+?)@endcomponent/);
            let filename = component[1].replace(/["']/g, '').split('.').join('/');
            let contents = component[2].replace(/@slot[\s\S]+?@endslot|@slot ?\(.*?, ?.*\)/g, '');
            let singleSlots = component[2].match(/@slot ?\(.*?, ?.*\)/g);
            let wholeSlots = component[2].replace(/@slot ?\(.*?, ?.*\)/g, '').match(/@slot[\s\S]+?@endslot/g);
            
            replacements.push("<?php ob_start(); ?>")
            replacements.push("<?php $slot = (object) []; ?>")

            replacements.push(`
                <?php ob_start(); ?>
                ${contents}
                <?php $slot->content = ob_get_clean(); ?>
            `);

            if (singleSlots) {
                singleSlots.forEach(slot => {
                    slot = slot.match(/@slot ?\((.*?), (.*)\)/);
                    let name = slot[1].replace(/["']/g, '');
                    let value = slot[2];

                    if (value.match(/^('|")|('|")$/)) {
                        value = JSON.stringify(JSON.parse(
                            value.replace(/^'|'$/g, '"')
                        ));
                    }

                    replacements.push(`<?php $slot->${name} = ` + value + ` ?? ""; ?>`);
                });
            }

            if (wholeSlots) {
                wholeSlots.forEach(slot => {
                    slot = slot.match(/@slot ?\((.*?)\)([\s\S]+)?@endslot/);
                    let name = slot[1].replace(/["']/g, '');

                    replacements.push([
                        '<?php ob_start(); ?>', slot[2],
                        `<?php $slot->${name} = ob_get_clean(); ?>`
                    ].join(''))
                });
            }

            let filepath = `dirname(__FILE__) . "${file.relativePath}/_includes/${filename}.php"`;

            replacements.push(`<?php if (file_exists(${filepath})) { include ${filepath}; echo ob_get_clean(); } else { ob_end_clean(); } ?>`);
            
            file.content = file.content.replace(/@component[\s\S]+?@endcomponent/, replacements.join("\n"));
        });
        
        return file;
    },

    /**
     * Replace with PHP continue tag.
     * This is used in loops such
     * as foreach, for and while.
     */
    continue: file => {
        file.content = file.content
            .replace(/@continue ?\((.*).*?\)/g, '<?php if ($1) { continue; } ?>')
            .replace(/@continue/g, '<?php continue; ?>');
        
        return file;
    },

    /**
     * Replaces matches with an else block.
     */
    else: file => {
        file.content = file.content.replace(/@else(?!.)/g, '<?php else : ?>');

        return file;
    },

    /**
     * Replaces matches with an else-if block.
     * Places arguments within parenthesis 
     * as they are supplied.
     */
    elseif: file => {
        file.content = file.content.replace(/@elseif ?\((.*).*?\)/g, '<?php elseif ($1) : ?>');

        return file;
    },

    /**
     * Similar to an if statement, checks to see 
     * if array is empty or if the value 
     * just doesn't exist.
     */
    empty: file => {
        file.content = file.content
            .replace(/@empty ?\((.*).*?\)/g, '<?php if (empty($1) || !($1)) : ?>')
            .replace(/@endempty/g, '<?php endif; ?>')

        return file;
    },

    /**
     * Creates a PHP for loop and carries over 
     * arguments to the provided action.
     */
    for: file => {
        return loopling(file, 'for');
    },

    /**
     * Create a foreach loop but also provides a $loop helper object.
     * The object will tell you the following about the array:
     * 
     * $loop->index     :: The index of the current loop iteration (starts at 0)
     * $loop->iteration :: The current loop iteration (starts at 1).
     * $loop->remaining :: The iteration remaining in the loop.
     * $loop->count     :: The total number of items in the array being iterated.
     * $loop->first     :: Whether this is the first iteration through the loop.
     * $loop->last      :: Whether this is the last iteration through the loop.
     */
    foreach: file => {
        return loopling(file, 'foreach');
    },

    /**
     * Set/override page property values.
     *
     * @return void
     */
    set: file => {
        file.content = file.content.replace(/@set ?\(["'](.*?)["'], (.*)\)/g, '<?php $page->$1 = $2; ?>');

        return file;
    },


    /**
     * Creates and PHP if block and passes along given arguments.
     */
    if: file => {
        file.content = file.content
            .replace(/@if ?\((.*).*?\)/g, '<?php if ($1) : ?>')
            .replace(/@endif/g, '<?php endif; ?>');

        return file;
    },

    /**
     * Create a PHP include file.
     */
    include: file => {
        file.content = file.content.replace(/@include ?\((.*)((?:, ?)[\s\S]+?)?.*?\)/g, (context, filename, variables) => {
            filename = filename.replace(/"|'/g, '').split(".").join("/")
            let filepath = `dirname(__FILE__) . "${file.relativePath}/_includes/${filename}.php"`;

            if (variables) {
                variables = variables.replace(/  +|\n|\t|^, ?/, "")
                return [
                    `<?php if (file_exists(${filepath})) {`,
                    'ob_start();',
                    `extract(${variables});`,
                    `include ${filepath}; echo ob_get_clean();`,
                    `} ?>`
                ].join(' ');
            }

            return `<?php if (file_exists(${filepath})) { include ${filepath}; } ?>`;
        });

        return file;
    },

    /**
     * Push contents to a named stack. 
     * Supports single line push 
     * and multiline push.
     */
    push: file => {
        let singlePushes = file.content.match(/@push ?\(.*?, ?.*\)/g);
        let wholePushes = file.content.match(/@push[\s\S]+?@endpush/g);

        if (!singlePushes && !wholePushes) {
            return file;
        }

        file.content = file.content.replace(/@push ?\((.*?), (.*)\)/g, (context, target, contents) => {
            target = target.replace(/["']/g, '');
            contents = JSON.stringify(JSON.parse(
                contents.replace(/^'|'$/g, '"')
            ));
            return `<?php $stacks["${target}"] = array_merge([${contents}], $stacks["${target}"] ?? []); ?>`;
        });

        file.content = file.content.replace(/@push ?\((.*?)\)([\s\S]+)?@endpush/g, (context, target, contents) => {
            target = target.replace(/["']/g, '');

            return [
                "<?php ob_start(); ?>", 
                contents,
                `<?php $stacks["${target}"] = array_merge([ob_get_clean()], $stacks["${target}"] ?? []); ?>`
            ].join("\n");
        });

        // if (singlePushes) {
        //     singlePushes.forEach(match => {
        //         match = match.match(/@push ?\((.*?), (.*)\)/);
        //         let name = match[1].replace(/["']/g, '');
        //         let value = JSON.stringify(JSON.parse(
        //             match[2].replace(/^'|'$/g, '"')
        //         ));

        //         file.blade.before.push(`<?php $stacks["${name}"] = array_merge([${value}], $stacks["${name}"] ?? []); ?>`);
        //     });
        // }

        // if (wholePushes) {
        //     wholePushes.forEach(match => {
        //         match = match.match(/@push ?\((.*?)\)([\s\S]+)?@endpush/);
        //         let name = match[1].replace(/["']/g, '');

        //         file.blade.before.push([ 
        //             "<?php ob_start(); ?>", match[2],
        //             `<?php $stacks["${name}"] = array_merge([ob_get_clean()], $stacks["${name}"] ?? []); ?>`
        //         ].join("\n"));
        //     });
        // }

        return file;
    },

    /**
     * Create a specific section that is yielded from a layout or include.
     */
    section: file => {
        let matches = file.content.match(/@section([\s\S]+?)@endsection/g);
    
        file.content = file.content.replace(/@section[\s\S]+?@endsection/g, '');

        if (!matches || !file.blade.before) {
            return file;
        }
        
        matches.forEach(match => {
            let parts = match.match(/@section ?\((.*?)\)([\s\S]+?)@endsection/);

            file.blade.before.push([ 
                "<?php ob_start(); ?>", 
                parts[2],
                `<?php $sections["${parts[1].replace(/"|'/g, '')}"] = ob_get_clean(); ?>`
            ].join("\n"));
        });

        return file;
    },

    /**
     * This outputs the contents of a push collection.
     */
    stack: file => {
        file.content = file.content
            .replace(/@stack ?\(["'](.*?)["']\)/g, '<?php echo join("", $stacks["$1"] ?? []); ?>');

        return file;
    },

    /**
     * The else of a general if-else statement, without extra conditionals.
     */
    unless: file => {
        file.content = file.content
            .replace(/@unless ?\((.*).*?\)/g, '<?php if (!($1)) : ?>')
            .replace(/@endunless/g, '<?php endif; ?>');

        return file;
    },

    /**
     * Creates a while loop
     */
    while: file => {
        return loopling(file, 'while');
    },

    /**
     * Output a stored section of the page.
     * Works in conjunction with sections.
     */
    yield: file => {
        file.content = file.content
            .replace(/@yield ?\(["'](.*?)["']\)/g, '<?php echo $sections["$1"] ?? ""; ?>');

        return file;
    }
}