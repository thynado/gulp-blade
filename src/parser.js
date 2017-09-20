/*!
 * Blade | Parser
 *
 * @author Nathan Thomas
 */
let directives = require('./directives');
let orders = [
    "break", "component", "continue", "else", "elseif",
    "empty", "for", "foreach", "set", "if", "include", 
    "push", "section", "stack", "unless", "while", "yield"
];

module.exports = (file, settings) => {
    // Relative path used for referencing other files correctly.
    file.relativePath = file.path
        .replace(file.base, '')
        .replace(/.*?\//g, '../')
        .replace(/\/?\w.*/, '')
        .replace(/^\./, '/.');

    // Reduces the amount of buffers needed down the line.
    // Remove code wrapped in comments before proceeding.
    file.content = file.contents
        .toString()
        .replace(/{{--[\s\S]+?--}}/g, "");

    // Pass along content to allowed handlers
    orders.forEach(filter => {
        if (typeof(directives[filter]) == 'function') {
            file = directives[filter](file);
        }
    });

    /**
     * Call all directives in order. The real 
     * modifiers occur in the directives file.
     */
    if (settings.directives) {
        for (let directive in settings.directives) {
            if (typeof(settings.directives[directive]) == 'function') {
                file = settings.directives[directive](file);
            }
        }
    }

    /**
     * Flat PHP files, such as data or plugins, 
     * will have a closing PHP tag 
     * appended to the end.
     */
    if ( ! file.content.match(/<\?php[\s\S]+(\?>)/g) && file.content.match(/<\?php[\s\S]+/g)) {
        file.content += "?>";
    }

    /**
     * Create sanitized and non-sanitized output.
     */
    file.contents = new Buffer(
        file.content

            .replace(/{!!\s*(.+?)\s*!!}/g, (context, match) => {
                match = match.replace(/ or /g, ' ?? ');

                return `<?php echo ${match}; ?>`;
            })

            /**
             * Assume that non-handled directives are project-defined functions. 
             * If a function name is called and has a closing end tag, it 
             * will be handled as a if statement. Otherwise, it will 
             * output the response of the assumed function.
             */
            .replace(/@([A-Za-z_]+) ?\((.*)\)(?!.*{)/g, (context, target, args) => {
                return `<?php if (${target}(${args})) : ?>`;
            }).replace(/@end([A-Za-z_]+)/g, "<?php endif; ?>")

            /**
             * Replace output tags.
             * @param  {[type]} /{{s*(.+?)s*}}/g [description]
             * @param  {[type]} (context,            match         [description]
             * @return {[type]}                      [description]
             */
            .replace(/{{\s*(.+?)\s*}}/g, (context, match) => {
                match += " or \"\"";
                match = match.replace(/ or /g, ' ?? ');

                if (settings.safeOutput === false) {
                    return `<?php echo ${match}; ?>`;
                }

                return `<?php echo htmlspecialchars(${match}, ENT_QUOTES, 'UTF-8', false); ?>`;
            })
    );

    return file;
}