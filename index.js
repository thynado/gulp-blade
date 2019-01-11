/*!
 * Blade Runner
 *
 * @author Nathan Thomas
 */
let parse = require("./src/parser");
let through = require("through2");
let yaml = require("js-yaml");

module.exports = (settings = {}) => {
    return through.obj(function (file, enc, cb) {
        if (file.isBuffer()) {

            /**
             * Replace the file extensions of .blade or .blade.php to be .php
             * Store a blade object on the file which holds the settings,
             * sections, before and after pieces that are later used.
             * 
             * @type string
             * @type object
             */
            file.path = file.path.replace(/\.blade(\.php)?/, '.php');
            file.blade = { settings: {}, sections: {}, before: [], after: [] }

            if ( file.path.match(/_includes|_layouts|_plugins|_data/g) ) {
                
                /**
                 * The file is an include, layout, plugin or data file.
                 * Pass it to the parser, but not allow pushes 
                 * or section definitions.
                 */
                file = parse(file, settings);

            } else {

                /**
                 * Parse the pages YAML header as the settings.
                 *
                 * @return string
                 */
                file.contents = Buffer.from(
                    file.contents.toString().replace(/^---\n?([\S\s]*?)\n?---\n?/, (context, match) => {
                        file.blade.settings = yaml.load(match) || {};

                        return '';
                    })
                );

                /**
                 * If the file settings specify a specific permalink, use it as the 
                 * file path that is written to disk. Otherwise, check if the 
                 * file name isn't an index file: if it's not, add its 
                 * name as a folder with the filename being index.
                 */
                if (file.blade.settings.permalink) {
                    let perma = file.blade.settings.permalink.replace(/\/$/, '');
                    
                    if (perma.match(/\.[a-z]+$/)) {
                        file.path = file.base + perma;    
                    } else {
                        file.path = `${file.base}${perma}/index.php`;
                    }
                } else if ( ! file.path.match(/index\.php$/)) {
                    file.path = file.path.replace(/(^.*)\.php$/g, "$1/index.php");
                }

                /**
                 * The pages URL - this currently assumes 
                 * it's placed from root location.
                 * 
                 * @type string
                 */
                file.url = "/";
                if (file.relative != "index.php") {
                    file.url = file.relative.replace("/index.php", "");
                }

                /**
                 * Pass the file to the parser to handle 
                 * transforms and translations.
                 * 
                 * @return File
                 */
                file = parse(file, settings);

                /**
                 * By default, set the pages contents as a 
                 * section labeled "content". This is 
                 * later yielded from a layout.
                 */
                file.blade.before.unshift([
                    "<?php ob_start(); ?>",
                    file.contents.toString(),
                    "<?php $sections[\"content\"] = ob_get_clean(); ?>"
                ].join("\n"));

                /**
                 * If the file has a layout defined in its settings, 
                 * include it, otherwise echo out the contents 
                 * of the newly created section.
                 */
                if (file.blade.settings.layout) {
                    file.blade.after.push(
                        `<?php include dirname(__FILE__) . "${file.relativePath}/_layouts/${file.blade.settings.layout.split('.').join('/')}.php"; ?>`
                    );
                } else {
                    file.blade.after.push("<?php echo $sections[\"content\"]; ?>");
                }

                /**
                 * Custom output buffer handling function.
                 * 
                 * @type string
                 */
                let buffer = `<?php echo ${settings.buffer}(ob_get_clean()); ?>`;

                /**
                 * Bring all changes and contents together as a new 
                 * Buffer object. All pieces are placed in order 
                 * of priority and should be handled with care.
                 * 
                 * @type Buffer
                 */
                file.contents = Buffer.from([
                    (settings.buffer && "<?php ob_start(); ?>"),
                    `<?php ob_start(); ?>${JSON.stringify(file.blade.settings)}<?php $page = json_decode(ob_get_clean()); ?>`,
                    `<?php $segments = explode("/", preg_replace("/^\\/|\\/$/", "", parse_url($_SERVER["REQUEST_URI"])["path"])); $segment = (object) ["one" => "", "two" => "", "three" => "", "four" => "", "five" => "", "six" => ""]; array_map(function ($value, $key) use ($segment) { $target = ["one", "two", "three", "four", "five", "six"][$key]; $segment->$target = $value; }, $segments, array_keys($segments)); $segments = join("/", $segments); $post = (object) $_POST; $get = (object) $_GET; $server = (object) array_change_key_case($_SERVER); $sections = []; $stacks = []; $page->url = "${file.url}"; $page->modified = date(${Date.now() / 1e3});`,
                    `foreach (glob(dirname(__FILE__) . "${file.relativePath}/_plugins/*.php") as $plugin) { include $plugin; }`,
                    `foreach (glob(dirname(__FILE__) . "${file.relativePath}/_data/*.php") as $filename) { $label = basename($filename, ".php"); if (!isset($$label)) { $contents = include $filename; $$label = json_decode(json_encode($contents)); }}`,
                    `?>`,
                    file.blade.before.join("\n"), 
                    file.blade.after.join("\n"),
                    (settings.buffer && buffer)
                ].filter(v => v).join("\n"));
            }
        }

        this.push(file);
        cb();
    });
};
