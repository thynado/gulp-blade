<p align="center">
    <img src="logo.png" width="150">
</p>

<p align="center">
    <img src="https://img.shields.io/badge/color-1.0.0-1c1c1c.svg?style=flat-square&label=stable">
    <img src="https://img.shields.io/badge/color-1.0.1-1c1c1c.svg?style=flat-square&label=upcoming">
</p>

# Gulp Blade
A Gulp plugin for converting Blade templates to safe, flat and compatible PHP files. This project draws inspiration from Jekyll and Laravel's Blade templating engine. 

## Logo attribution
The logo is used under the Creative Commons license and was designed by [Anbileru Adaleru](https://thenounproject.com/search/?q=sword&creator=655313&i=531445) at [The Noun Project](https://thenounproject.com/). Check out their work [here](https://thenounproject.com/pronoun/).

## Syntax highlighting (Sublime Text 3)
The syntax definition in this project is different than the one you may have seen on Package Control. It's more open, meaning it's not bound to a set of directives and is instead dynamic to whatever matches the directive pattern. To set it up and keep up with updates, run the following:

``` shell
ln -s $(pwd)/editors/blade.sublime-syntax ~/Library/Application\ Support/Sublime\ Text\ 3/Packages/User/
```

## Layouts
Layout files are stored in a `_layouts` folder at the root source of your project. Files created here are accessible to pages from their YAML front matter settings. We'll get more into that later on. Below is an example that will also be used as reference later on:

``` php
<!DOCTYPE html>
<html lang="en">
<head>
    <title>
        {{ $page->title }}
    </title>
</head>
<body>

    <main role="main">
        @yield("content")
    </main>

</body>
</html>
```

## Includes & Components
Include files are stored in an `_includes` folder at the root source of your project. Files created here are accessible to pages and layouts. Below is an example that will also be used as reference later on:

``` php
<body>
    @include("header")
</body>
```

Includes are unique from everything else. They can be used as directly included files or can be extended to be used as micro-templates, otherwise known as **Components**. This, for example, makes creating reusable components very easy.

``` php
@component("modal")
    @slot("title", "Hello world")

    My modal content goes here!
@endcomponent
```

## Plugins
Plugin files are stored in a `_plugins` folder at the root source of your project. All files created here are auto-loaded into each page after page setting definitions and manipulations, this means you have full access to the page and it’s data. Though they are ran through the blade parser, you can use these files to define good ole’ PHP helper functions, database/API handlers, etc.

#### `_plugins/helpers.blade.php`
``` php
function url ($appendage = "") {
    return "https://domain.foo/${$appendage}";
}

function foo () {
    global $page;

    return "${$page->title}!!";
}
```

If you’re looking to use another plugin after blade parsing, such as `html-minifier`, you need not worry about closing PHP tags, those are taken care of automatically for both [Plugin](#plugins) and [Data files](#data).

## Data
Data files are stored in an `_data` folder at the root source of your project. All files created here are auto-loaded into each page after page setting definitions, manipulations and before plugins are loaded.  Though they are ran through the blade parser, you can use these files to define shareable data across the project.

For the following examples, we’ll reference a `_data/site.blade.php` data file:

``` php
return [
    "title" => "Papa Johns"
];
```

From a page, include or layout you can get a data value similar to how you would a page setting:

``` php
<h3>
    Welcome to {{ $data->site->title }}
</h3>
```

From a plugin you can get, set, delete and manipulate values:

``` php
$data->site->title = "Little Caesars";

if ($page->url == "/") {
    $data->site->is_home = true;
    // or
    $page->is_home = true;
}
```

## Pages
A file is determined as page when it does not exist within a project specified directory (plugins, data, layouts, includes). If you’ve had experience with Jekyll the following will be familiar to you. 

Each page defines it’s own settings in YAML at the top of the file. These settings are parsed, given to PHP, and then decoded into an object at run time. Some specific settings are looked for within the parser to be handled uniquely.

For example, let’s create a home page with a title and define the layout that later wraps our pages contents:

``` php
---
title: Welcome!
layout: default
---

Hello world! Tis I, thy whom seekith the blade of destiny!
```

Below is a list of other settings that are looked for and handled uniquely, much like `layout` is to the home page we created above:

##### `layout`
The layout file used to wrap a pages content. This value would be the file name of the layout file, minus the `.blade.php` extension. 

##### `permalink`
Customize the pages URL from what it would have been by default.

## Directives
Directives are what translate to PHP equivalents from a Blade template. The best way to explain them is by example. Below is a list of all directives available to a Blade template. 

##### `if`

``` php
@if (expression)

@endif
```

##### `elseif`

``` php
@if (expression)

@elseif (expression)

@endif
```

##### `else`

``` php
@if (expression)

@else

@endif
```

##### `empty`

``` php
@empty (variable)

@endempty
```

##### `unless`

``` php
@unless (expression)

@endunless
```

##### `for`

``` php
@for ($x = 0; $x <= 10; $x++)

@endfor
```

##### `while`

``` php
@while (condition is true)

@endwhile
```

##### `foreach`

``` php
@foreach ($dogs as $dog)

@endforeach

// or with key:value pairs

@foreach ($dogs as $dog => $details)

@endforeach
```

##### `$loop`
The `$loop` variable is available in `for`, `while` and `foreach` loops. Their usage and benefit are exemplified below:

``` php
@foreach ($dogs as $dog)
  $loop->first
  $loop->last
  $loop->even
  $loop->odd
  $loop->index
  $loop->iteration
  $loop->remaining
  $loop->count
@endforeach
```

##### `continue`

``` php
@foreach (...)
  @if (expression)
    @continue
  @endif

  // or simply

  @continue(expression)
@endforeach
```

##### `break`

``` php
@foreach (...)
  @if (expression)
    @break
  @endif

  // or simply

  @break(expression)
@endforeach
```

##### `include`

``` php
@include("header")

// or pass it custom variables

@include("header", ["transparent" => true])

// or clean that up a bit with

@include("header", [
  "transparent" => true
])
```

##### `component`

``` php
@component("modal")
  @slot("title", "Hi friend")

  The modal contents
@endcomponent
```

##### `push`

``` php
@push("styles", "/css/style.css")

// or

@push("scripts")
  <script src="..."></script>
  <script src="..."></script>
@endpush
```

##### `stack`

``` php
@stack("styles")
@stack("scripts")
```

##### `section`

``` php
@section("my-section")

@endsection
```

##### `yield`

``` php
@yield("my-section")
```

## Custom Directives
Defining custom directives is automatically handled in a dynamic way. After core directives are processed, the parser will check one last time for any unparsed directives that remains. Depending on how your directive is structured in your template will determine how it is parsed.

``` php
// Before
@if (cool())
    ...
@endif

// After
@cool()
    ...
@endcool
```

Since blocks are boolean based directives, you can also use `else` and `elseif` directives:

``` php
@cool()
    ...
@elseif (...)
    ...
@else
    ...
@endcool
```