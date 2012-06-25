# klunk.js

	- a hackable testing framework for JavaScript

## Features Overview

Klunk allows you to have a fine grained control over the execution of your tests, most
importantly giving you a choice to execute each suite's specs either in parallel or serial mode.

- Asynchronous parallel or serial mode defined per suite, nested as you like
- Global or individual propagating options per suite
- Miniature underscore utility
- A simple, yet powerful syntax
- Works as a NodeJs module, and is planned soon to work in a browser

### An Example

```javascript
describe ( "Your suite", function() {

	topic (function(){
		this.greeting = "welcome!";
	});
	beforeEach (function(){}); // before each test
	afterEach (function(){}); // after each test
	coda (function(){}); // when all child and nested specs of this suite are done

	it ( "comes with a familiar syntax" , function () {
		this.expects ( "the learning curve" ).not.toBe ( 'difficult' )
	} );
	it ( "allows any definition to be asynchronous" , function (done) {
		klunk._.delay (done, 1000)
	})

	describe ( "context, pre and post processing", function () {

		topic ( "A setup function that only runs once", function (done /*optional*/) {
			this.dry = true
		});
		beforeEach ( "Can have an optional description", function (done /*optional*/) {
			this.dry = false;
			done()
		});
		it ( "provides individual context for each spec", function () {
			this.expects ( this.dry ).toBe ( false );
			this.expects ( this.topic.dry ).toBe ( true );
			this.expects ( this.topic.parent.greeting ).toBe ( "welcome!" );
		});
	} );

	describe ( "options parameter", function () {

		it ("can be passed to the control function which each suite returns" );

		describe ( "within child suites", function () {
			it ("sets options for this and defaults for child suites",
				function (done) {} )
		} ) ({timeout: 50})

	} ) ({timeout: 100, callback: function (suite, report) {}});

	describe ("serial option", function () {
		it ('causes child definition functions to run in order they were defined' )
	}) ({serial:true});
} );

klunk.run ()

```

## API

### Concepts

Preprocessors and postprocessors
--------------------------------

beforeEach and afterEach execute in serial before and after each spec.
topic and coda execute in serial once before and after each suite, respectively.
You can have multiple definitions of the same type per suite, they will execute serially,
in order that they were defined.

Serial and parallel
-------------------

The preprocessors always wait to finish before specs begin to execute. If the suite is set to run
in serial mode, klunk will wait for each spec to finish before executing the next. Child suites always wait
for the parent suite to finish before executing. The spec isn't finished until all its afterEach functions are
finished, if provided. The suite isn't finished until all codas have executed in serial.

Context sharing and isolation
-----------------------------

Mastering this section can well improve your testing speed, and organization.

Each spec has its own context, separate from other specs.

Topic and coda share context within their suite, exposing the same one to each spec, beforeEach, and
afterEach through their respective this.topic. The topic of a parent suite can be accesses as this.topic.parent.

beforeEach and afterEach methods execute each time within their spec's context, but their this.topic
remains relative to their suite, that could be a very useful feature.

Each spec's context has only two reserved fields: topic and expects. The rest is up to you to use as you like.


### Options

Klunk has a set of global options, and a set of options for each suite, preprocessor, postprocessor, and spec.
The ease and accessibility of these is one of the most important features in klunk.

Some options propagate down from parent to child. For example setting a timeout value for a suite will
determine the timeout for all nested topic, coda, beforeEach, and afterEach methods at any level, unless
any one of them sets their own. An option is considered unset if it's value is null, and set if it
corresponds to its basic type, such as boolean or number.

#### Kontrol object

All definition functions, i.e. describe, it, beforeEach, afterEach, topic, and coda, return a function object
that can be used to set options, or launch suites individually. Each definition function returns its own
flavor of the kontrol object.

Examples:

    it ("expects an asynchronous result", function(done) {...} ) ({timeout:1000,callback:testDone});
	topic ("a remote connection", function(done){...}).timeout(1000).callback(topicDone);
	describe.run (callback);

Most options can be set in either of the two above styles.

Here's a reference to kontrol objects returned by each definition type. It will list options and parameters
that they can accept as well as the chainable methods they expose.

##### describe

Its kontrol objects can accept undefined, boolean true, or a callback function, each signaling the suite
and its child suites to run immediately.

Options it can use:

- 	__timeout__ [default: null] Will cause all asynchronous definitions to fail by timeout after
		the specified time. Propagates down.
-	__serial__ 	[default: null] Will cause each child definition function to run
		in the order they were defined. Propagates down.
		that included topics, codas, it, describe, beforeEach, and afterEach functions
-	__callback__ will trigger upon the completion or timeout of all definition functions.
-	__silent__ will prevent the suite's results from being reported. Setting this value
		for child suites to false after setting it to true on the parent will have no effect.
-	__matchers__ this option will be covered in the matchers section

##### it

-	__timeout__ to override anything that may have propagated from the parent
-	__matchers__ this option will be covered in the matchers section
-	__callback__ which will trigger as soon as the spec is done receiving
		the spec object as a parameter. This will happen before the results are reported

##### topic, coda, beforeEach, afterEach

-	__timeout__ to override anything that may have propagated from the parent
-	__callback__ which will trigger as soon as the spec is done receiving
		the spec object as a parameter. This will happen before the results are reported

#### Global Options

You can access global options directly with klunk.options, but a more recommended approach is to
use klunk.set ({...}) as some options are nested and also that it maybe easier to store options
in an external bootstrap file. klunk.set recurs through the passed object and assigns any
values to the corresponding options keys.

##### A list of global options:
-	__autorun__ [default: null] true will cause klunk to run suites as they are read, without needing to call klunk.run().
-	__serial__ [default: null] true will cause specs and suites to run one at a time.
-	__timeout__ [default: 5000] will cause asynchronous functions to fail after a specified time.
-	__silent__ [default: null] will prevent klunk from reporting results.
-	__callback__ [default: null] can be a function to trigger upon successful completion of suites ran with klunk.run()
-	__report__:
	-	__color__ [default:true] applies only to the terminal reporter
	-	__passed__ [default:false] causes the reporter to show passed tests

### Matchers

Matchers work very similarly to jasmine. A spec, beforeEach, and afterEach
share context, so you can technically have expectations in any of the three clauses.
Example of a basic spec, and a negation spec:

    this.expects (true).toBe(true)
    this.expects (true).not.toBe(false)


Klunk comes with a kollection of handy matchers, which are listed below, but should you
desire to add your own (and you should) it is exceedingly easy.

An example matcher function may look like this:

    toBeAMultipleOf: function (expected) { return this.actual % expected == 0 }

It will be accessible and executed using a similar to jasmine syntax:

    this.expects (10).toBeAMultipleOf(5)

You can add matchers using the addMatchers method of: klunk, a suite, a spec.
Context of topic, beforeEach, and it functions also contains this method.
You can also pass it as an option to klunk, describe, or it.

```javascript

var matchers =
	{toBeAMultipleOf: function (expected) { return this.actual % expected == 0 }};

klunk.addMatchers (matchers)
describe("suite",function(){..}).addMatchers (matchers)
describe("suite",function(){..}) ({matchers:matchers})
it("spec",function(){..}).addMatchers (matchers)
it("spec",function(){..}) ({matchers:matchers})
topic (function(){
	this.addMatchers (matchers)
})
beforeEach (function(){
	this.addMatchers (matchers)
})
it (function(){
	this.addMatchers (matchers)
})

```

_TIP:_ set this.actual to some string describing what it is within your custom
		matcher to see the reporter display it, instead of an obumbrated [object Object] or the like

#### Built-in Matchers

-	toBe (object) strict equal ===
-	toBeFalsy
-	toBeTruthy
-	toBeDefined
-	toBeEmpty
-	toHaveKey (string)
-	toHaveKeys(string array)
-	toEqual (object) using deep, loose comparison
-	toStrictlyEqual (object) using deep, strict comparison

## TODO

-	Create a browser reporter, to allow klunk to run in browser
-	Document the wonderful klunk._ methods
-	Document the suite object, passed to the callback functions
-	Create a jasmine compatibility mode, since we are so close

## What People May Say About Klunk

-	It is the last testing framework for JavaScript that I will ever need!
-	I used to make spaghetti but thanks to klunk I'm a real hacker now!
-	On the surface he may seem like sheer power, but he's actually got a beautiful heart...


# License

(The MIT License)

Copyright (c) 2011 Bijou Trouvaille @ https://github.com/bijoutrouvaille

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.