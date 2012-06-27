/**
 * Author: Bijou Trouvaille
 * Created using JetBrains PhpStorm
 * Date: 6/19/12
 * Time: 10:26 PM
 */

/*
* #toc
* #tr TerminalReporter
* */

var klunk = typeof window != 'undefined' ? window.klunk : require ( '../klunk' );
var _ = klunk._;
klunk.set({autorun:true, callback : suiteDone});

function suiteDone (top) {

	var rep = function (suite) {

		if (suite.text && ~suite.text.indexOf('fixture') || suite.options.silent) return;

		var print = function (type, text, res) {

			res.timedOut && console.log ( '%s "%s" function timed out', type, text );
			res.triggered || console.log ( '%s "%s" function not triggered', type, text );

		};

		_.each ('coda,topic'.split(','), function ( name ) {
			_.each (suite[name+'s'], function ( fn, i ) {
				print (name, fn.text, fn);
			});
		});
		_.each (suite.specs, function ( spec ) {
			if (!spec.fn){
				return
			}
			if (spec.fn ) {
				print ('spec', spec.text, spec.result);
				_.each (['before','after'], function ( name ) {

					_.each (spec.result[name+'s'], function ( stats, i ) {

						print (name, i+' '+stats.text,stats)

					})

				})
			}

		});
		_.each (suite.suites, rep, this)
	};

	//rep (top);
}
klunk.addMatchers ({
	toHaveTriggered : function () {
		var r = this.actual.result || this.actual;
		this.actual = '"' + this.actual.text + '"';
		return r.triggered
	},
	toHaveTimedOut: function () {
		return this.actual.timedOut instanceof _.TimeoutError
	}
});


describe ( "klunk's it", function () {
	it ( "can be empty" );
	it ( "passes", function () {
		this.expects ( true ).toBe ( true );
		this.test = true;
	} );
	it ( "has own context", function () {
		this.expects ( true ).toBe ( true );
		this.expects ( this.test ).toBe ( undefined );
	} );
} );
describe ( "test suite", function () {
	it ( "runs a spec", function () {
		this.expects ( true ).toBe ( true )
	} );
	describe ( "nested", function () {
		describe ( "beyond second level", function () {
			describe ( "at third level", function () {
				it ( "runs a deeply nested spec", function () {
					this.expects ( true ).toBe ( true )
				} );
			} );
			it ( "runs a less deeply nested spec", function () {
				this.expects ( true ).toBe ( true )
			} );
		} );
	} );

	describe ( "beforeEach", function () {
		var count = 0;
		topic ( function () {
			this.level1 = true;
		} );
		beforeEach ( "1", function () {
			this.dinoflagellate = "noctiluca";
			this.count = ++count;
			this.count2 = this.count2 ? this.count2 + 1 : 1;
			this.level1 = this.topic.level1;
		} );
		it ( "passes the context", function () {
			this.expects ( this.dinoflagellate ).toBe ( "noctiluca" );
		} );
		it ( "runs before each test", function () {
			this.expects ( this.count ).toBe ( 2 )
		} );
		it ( "gets a new context for each spec", function () {
			this.expects ( this.count2 ).toBe ( 1 )
		} );
		describe ( "nested", function () {
			beforeEach ( "2", function () {
				this.dinoflagellate = this.dinoflagellate.toUpperCase ();
			} );
			it ( "runs before the child beforeEach", function () {
				this.expects ( this.dinoflagellate ).toBe ( "NOCTILUCA" );
			} );
			it ( "maintains the topic relative to its suite", function () {
				this.expects ( this.level1 ).toBe (true);
			} );
		} );
	} );
} );

describe ( "processor function fixture", function () {
	beforeEach ( function ( done ) {
		done();
	} );
	afterEach ( function ( done ) {
		done()
	} );
	beforeEach ( function () {
	} );
	afterEach ( function () {
	} );
	topic ( function ( done ) {
		done();
	} );
	coda ( function ( done ) {
		done()
	} );
	topic ( function () {
	} );
	coda ( function () {
	} );
	it ( "triggers all processors", function (  ) {
	} );
} ) ({silent:true, callback : function ( suite ) {
	describe ( "triggered flag", function () {
		it ( "is on for every topic and function that is ran", function () {
			this.expects ( suite.topics[0] ).toHaveTriggered ();
			this.expects ( suite.topics[1] ).toHaveTriggered ();
			this.expects ( suite.codas[0] ).toHaveTriggered ();
			this.expects ( suite.codas[1] ).toHaveTriggered ();
		} );
		it ( "is on for beforeEach and afterEach inside spec's results", function () {
			this.expects ( suite.specs[0].result.befores[0] ).toHaveTriggered ();
			this.expects ( suite.specs[0].result.befores[1] ).toHaveTriggered ();
			this.expects ( suite.specs[0].result.afters[0] ).toHaveTriggered ();
			this.expects ( suite.specs[0].result.afters[1] ).toHaveTriggered ();
		} );
	} );
}});

describe ( "topic", function () {
	var plants = {"feverfew" : 'febrifuge'};
	topic ( function () {
		this.overrun = !!this.plants;
		this.plants = plants;
	} );
	it ( "is accessible through the topic field", function () {
		this.expects ( this.topic ).toBeDefined ()
	} );
	it ( "passes context", function () {
		this.expects ( this.topic.plants ).toBe ( plants )
	} );
	it ( "runs only once", function () {
		this.expects ( this.topic.overrun ).toBe ( false )
	} );
	it ( "combines multiple topic definitions", function () {
		this.expects ( this.topic.another ).toBe ( 'world' )
	} );
	it ( "does not pass child context", function () {
		this.expects ( this.topic.one ).not.toBeDefined ()
	} );
	describe ( "nested", function () {
		topic ( function () {
			this.one = "place";
			this.another = this.parent.another.toUpperCase ();
		} );
		it ( "does not expose parent topics directly", function () {
			this.expects ( this.topic.plants ).not.toBeDefined ()
		} );
		it ( "executes parent topics before child topics", function () {
			this.expects ( this.topic.another ).toBe ( 'WORLD' )
		} );
		describe ( "two levels deep", function () {
			topic ( function () {
				this.one = "place";
				this.another = this.parent.parent.another;
			} );
			it ( "executes parent topics before child topics", function () {
				this.expects ( this.topic.another ).toBe ( 'world' )
			} );
		} );
	} );
	topic ( function () {
		this.another = 'world';
	} );
} );


describe ( "horizontal synchronicity pattern", function () {

	topic ( function ( done ) {
		_.delay ( function () {
			this.count = 1;
			done ()
		}, 40, this )
	} );
	beforeEach ( function ( done ) {
		_.delay ( function () {
			this.fore = true;
			done ()
		}, 30, this )
	} );
	afterEach ( function () {
		this.expects ( this.aft ).toBe ( true )
	} );
	it ( "finishes longer timeout second", function ( done ) {
		_.delay ( function () {
			this.expects ( this.topic.count++ ).toBe ( 2 );
			this.expects ( this.fore ).toBe ( true );
			this.aft = true;
			done ()
		}, 20, this )
	} );
	it ( "finishes shorter timeout first", function ( done ) {
		_.delay ( function () {
			this.expects ( this.topic.count++ ).toBe ( 1 );
			this.expects ( this.fore ).toBe ( true );
			this.aft = true;
			done ()
		}, 10, this )
	} );
	describe ( "nested spec", function () {
		it ( "finishes a nested spec last", function ( done ) {
			_.delay ( function () {
				this.expects ( this.topic.parent.count++ ).toBe ( 3 );
				this.expects ( this.fore ).toBe ( true );
				this.aft = true;
				done ()
			}, 5, this )
		} );
	} );

} );

describe ( "klunk serial execution of asynchronous specs", function () {
	topic ( function ( done ) {
		_.delay ( function () {

			this.count = 0;
			done ();

		}, 20, this );
	} );
	it ( "finishes first test first", function ( done ) {
		_.delay ( function () {
			this.expects ( this.topic.count++ ).toBe ( 0 );
			done ()
		}, 30, this );
	} );
	it ( "finishes second test second", function ( done ) {
		_.delay ( function () {
			this.expects ( this.topic.count++ ).toBe ( 1 );
			done ()
		}, 15, this );
	} );
	it ( "finishes third test third despite having the shortest timeout", function ( done ) {
		_.delay ( function () {
			this.expects ( this.topic.count++ ).toBe ( 2 );
			done ()
		}, 1, this );
	} );

} ) ( {serial : true} ) ;

describe ( "addMatchers method", function () {
	var pass = function () { return true };
	topic ( function () {
		this.addMatchers ({
			toExtendFromTopic: pass
		})
	} );
	beforeEach ( function () {
		this.addMatchers ({
			toExtendFromBeforeEach: pass
		})
	} );
	it ( "projects topic matchers", function () {
		this.expects (  ).toExtendFromTopic();
	} );
	it ( "projects topic matchers", function () {
		this.expects (  ).toExtendFromBeforeEach();
	} );
	it ( "can be used right inside it", function () {
		this.addMatchers ({
			toWorkRightHere: pass
		});
		this.expects ().toWorkRightHere ();
	} );
	describe ( "nested", function () {
		topic ( function () {
			this.addMatchers ({
				toExtendFromNestedTopic: pass
			})
		} );
		it ( "projects topic matchers", function () {
			this.expects (  ).toExtendFromTopic ( );
		} );
		it ( "projects topic matchers", function () {
			this.expects (  ).toExtendFromBeforeEach();
		} );
		it ( "projects nested topic matchers", function () {
			this.expects ().toExtendFromNestedTopic ();
		} );
	} );
	describe ( "in suite's kontrol object", function () {
		it ( "attaches matchers to child specs", function () {
			this.expects ().toBeAttachedBySuitesMethod ();
		} );
		describe ( "propagating to children", function () {
			it ( "attaches matchers to child specs a level deeper", function () {
				this.expects ().toBeAttachedBySuitesMethod ();
			} );
		} );
	} ).addMatchers({toBeAttachedBySuitesMethod:function(){return true}});
	describe ( "in spec's kontrol object", function () {
		it ( "attaches matchers to child specs", function () {
			this.expects ().toBeAttachedBySpecsMethod ();
		} ).addMatchers({toBeAttachedBySpecsMethod:function(){return true}});
	} );
	describe ( "in background, processing options", function () {
		it ( "can be attached to suite", function () {
			this.expects().toBeAttachedBySuiteOption();
		} );
		it ( "can be attached to spec", function () {
			this.expects().toBeAttachedBySpecOption();
		} )({matchers:{toBeAttachedBySpecOption:function(){return true}}});
	} ) ({matchers:{toBeAttachedBySuiteOption:function(){return true}}});
} );
describe ( "Built-in matcher", function () {
	describe ( "toBeEqual", function () {
		it ( "uses _.isEqual without the strict option", function () {
			this.expects ( {a:true,b:{c:'1'}} ).toEqual({a:1,b:{c:1}});
		} );
	} );
	describe ( "toBeStrictlyEqual", function () {
		it ( "uses _.isEqual with the strict option", function () {
			this.expects ( {a:1,b:{c:1}} ).toStrictlyEqual({a:1,b:{c:1}});
		} );
	} );
	describe ( "toHaveKey", function () {
		it ( "uses _.has", function () {
			this.expects ( {a : 1, b : 2} ).toHaveKey ('b');
		} );
	} );
	describe ( "toHaveKeys", function () {
		it ( "returns true if keys array passed intersects the actual keys array", function () {
			this.expects ( {a:1,b:2,c:{d:{e:4}}} ).toHaveKeys ('a b c'.split(' '));
		} );
	} );
	describe ( "toBeEmpty", function () {
		it ( "passes if passed object that is empty", function () {
			this.expects ( {} ).toBeEmpty ();
		} );
		it ( "passes if passed array that is empty", function () {
			this.expects ( [] ).toBeEmpty ();
		} );
		it ( "passes if passed arguments that is empty", function () {
			this.expects ( arguments ).toBeEmpty ();
		} );
		it ( "passes if passed a falsy value", function () {
			this.expects ( null ).toBeEmpty ();
		} );
		it ( "passes if passed an empty string", function () {
			this.expects ( '' ).toBeEmpty ();
		} );
	} );
	describe ( "toBeTruthy", function () {
		it ( "uses a word that is not a word to describe a thing that is expected to be some thing", function () {
			this.expects ( 'a thing' ).toBeTruthy ();
		} );
	} );
} );

klunk.topic.silent = false;
describe ( "a silent suite fixture", function () {
	it ( "will not print its results", function () {
		klunk.topic.silent = true;
		this.expects ( true ).toBe ( false )
	} );
} ) ({silent: true});

klunk.topic.after = {a1:0,a2:0};
klunk.topic.coda = {c1:0,c2:0};
describe ( "a fixture suite for cleanup testing", function () {

	coda ( function () {
		klunk.topic.coda.c1++;
	} );

	it ( "is needed for after each", function () { } );
	afterEach ( function () {
		klunk.topic.after.a1++;
	} );
	describe ( "nested", function () {
		it ( "does nothing but trigger afterEach", function () { } );
		afterEach ( function () {
			klunk.topic.after.a2++;
		} );
		coda ( function () {
			klunk.topic.coda.c2++;
		} );
	} );

} ) ( {silent : true, callback : function ( suite ) {
	describe ( "afterEach", function () {
		it ( "triggers the outer afterEach twice", function () {
			this.expects ( klunk.topic.after.a1 ).toBe ( 2 );
		} );
		it ( "triggers the inner afterEach once", function () {
			this.expects ( klunk.topic.after.a2 ).toBe ( 1 );
		} );
	} ) ();
	describe ( "coda", function () {
		it ( "the outer coda triggers only once", function () {
			this.expects ( klunk.topic.coda.c1 ).toBe ( 1 );
		} );
		it ( "the inner coda triggers only once", function () {
			this.expects ( klunk.topic.coda.c2 ).toBe ( 1 );
		} );
	} ) ();
}} );


describe ( "Callback fixture", function () {
	var defer = function ( done ) { _.delay ( done ) };
	describe ( "async", function () {
		beforeEach ( defer );
		afterEach ( defer );
		coda ( defer );
		it ( "is async", defer );
		describe ( "nested", function () {
			it ( "is async", defer  );
		} );
	} );

} ) ( {silent : true, timeout:10000, callback : function ( suite ) {

	klunk.topic.kallback = suite;

}} ).suite && _.wait ( function () { return klunk.topic.kallback }, function () {

	describe ( "Suite callback", function () {
		it ( "fires with the suite as a parameter", function () {
			this.expects ( klunk.topic.kallback ).toHaveKeys ( "befores afters suites options".split ( " " ) );
		} );
	} );
} );

describe ( "timeout fixture", function () {
	describe ( "beforeEach", function () {
		beforeEach ( function ( done ) {
		} );
		it ( "shouldn't trigger", function () {
			this.expects ( false ).toBe ( true )
		} );
	} );
	describe ( "in serial mode afterEach", function () {
		afterEach ( function ( done ) {

		} );
		it ( "", function () {
			this.expects ( true ).toBe ( true )
		} );
		describe ( "timeout causes child suites not to trigger", function () {
			it ( "shouldn't trigger", function () {
				this.expects ( false ).toBe(true)
			} );
		} );
	} ) ({serial:true});
	describe ( "topic", function () {
		topic ( function ( done ) {
		} );
		it ( "shouldn't trigger", function () {
		} );
		describe ( "having nested suites", function () {
			it ( "shouldn't trigger", function () {
			} );
		} );
	} );

} ) ( { timeout : 1, silent: true , callback: function ( suite ) {

	describe ( "Asynchronous operation timeout", function () {
		topic ( function () {
		} );
		describe ( "on beforeEach", function () {
			it ( "marks the function as timedOut", function () {
				this.expects ( suite.suites[0].specs[0].result.befores[0] ).toHaveTimedOut();
			} );
			it ( "prevents the spec upon which it failed from running", function () {
				this.expects ( suite.suites[0].specs[0] ).not.toHaveTriggered ();
			} ) ;
		} );
		describe ( "on afterEach in serial mode", function () {
			it ( "marks the function as timedOut", function () {
				this.expects ( suite.suites[1].specs[0].result.afters[0] ).toHaveTimedOut();
			} );
			it ( "prevents the specs in nested suite from running", function (  ) {
				this.expects ( suite.suites[1].suites[0].specs[0] ).not.toHaveTriggered();
			} ) ;
		} );
		describe ( "on topic", function () {
			it ( "marks the function as timedOut", function () {
				this.expects ( suite.suites[2].topics[0] ).toHaveTimedOut();
			} );
			it ( "prevents the specs in nested suite from running", function (  ) {
				this.expects ( suite.suites[2].suites[0].specs[0] ).not.toHaveTriggered();
			} ) ;
		} );
	} ) ();

} } );

//#tr
describe ( "TerminalReporter timeout failure display", function () {
	describe ( "timing out a topic", function () {
		topic ( "that never called back", function ( done ) {
		} );
	} );
	describe ( "timing out specs", function () {
		it ( "prints that it did time out", function ( done ) {
		} );
	} );
	describe ( "timing out beforeEach", function () {
		beforeEach (  function ( done ) {
		} );
		it ( "shows specs as failed - not ran", function () {
		} );
	} );
	describe ( "timing out afterEach", function () {
		afterEach ( "brush your teeth", function ( done ) {
		} );
		it ( "triggers and succeeds", function () {
		} );
	} );
	describe ( "timeout out codas", function () {
		coda ( "sharpen your tongue", function ( done ) {
		} );
	} );
} ) ({timeout:1}) (true);

//#_
describe ( "klunk underscore methods", function () {
	var _ = klunk._;
	describe ( "extend", function () {
		it ( "copies onto the first object", function () {
			var obj = {a:1};
			_.extend ( obj, {b : 2}, {c : 3} );
			this.expects ( obj.a ).toBe ( 1 );
			this.expects ( obj.b ).toBe ( 2 );
			this.expects ( obj.c ).toBe ( 3 );
		} );
	} );
	describe ( "has", function () {
		it ( "returns true if a key exists", function () {
			this.expects ( _.has ( {a : 1, b : 2}, 'b' ) ).toBe ( true );
		} );
	} );
	describe ( "first", function () {
		describe ( "firstBoolean", function () {
			it ( "returns the first true boolean from the argument list", function () {
				this.expects ( _.firstBoolean ( null, undefined, false, true ) ).toBe ( false );
			} );
			it ( "returns the first true boolean from a passed array", function () {
				this.expects ( _.firstBoolean ( [undefined, null, 1, 0, true, false] ) ).toBe ( true );
			} );
		} );
	} );
	describe ( "type", function () {
		it ( "returns objects type as from Object.prototype.toString", function () {
			this.expects ( _.type ( [] ) ).toBe ( 'Array' );
		} );
	} );
	describe ( "intersect", function () {
		it ( "returns common values", function () {
			this.expects ( _.intersect ([1,2,3,4,5,6], [1,3,4,6]) ).toEqual ([1,3,4,6]);
		} );
	} );
	describe ( "isEqual", function () {
		it ( "compares loosely by default", function () {
			this.expects ( _.isEqual ( {a : 1, b : '2', c : {2 : 3}}, {a : true, b : 2, c : {2 : '3'}} ) ).toBe(true);
		} );
		it ( "compares strictly, if asked", function () {
			this.expects ( _.isEqual ( {a : 1, b : '2', c : {2 : 3}}, {a : true, b : 2, c : {2 : '3'}}, true ) )
				.toBe(false);
		} );
	} );
	describe ( "each", function () {
		it ( "binds context and arguments", function () {
			_.each ([1,2,3], function (value, key, a,b,c) {
				this.expects ( _.slice(arguments, 2) ).toEqual ([4,5,6]);
			}, this, 4,5,6)
		} );
		it ( "breaks if strict true was passed", function () {
			_.each ([1,2,3], function ( v ) {
				this.expects ( v ).not.toBe(2);
				return v===1
			}, this)
		} );
	} );
	describe ( "wait", function () {
		it ( "calls back when a condition is true", function ( done ) {
			this.ok = false;
			_.wait (function () {return this.ok}, function () {
				this.expects ( this.ok ).toBe ( true );
				done()
			}, this);
			_.delay (function () {
				this.ok = true;
			}, 50, this)
		} );
		it ( "times out if the wait is too long", function ( done ) {
			this.ok = false;
			_.wait (1,function () {return this.ok}, function () {
				this.expects ( this.ok ).toBe ( false );
				done()
			}, this);
			_.delay (function () {
				this.ok = true;
			}, 20, this)
		} );
		it ( "accepts a sleep interval", function (done) {

			var ok = false;
			_.wait (10,11,function () {return ok}, done);
			_.delay (function () {
				ok = true;
			}, 20, this)

		} );
	} );
	describe ( "sprintf", function () {
		it ( "replaces %s with arguments", function () {
			this.expects ( _.sprintf ( 'a lazy %s jumped over a %s fox', 'dog', 'stark' ) )
				.toBe ('a lazy dog jumped over a stark fox');
		} );
		it ( "leaves extra %s if there are too few arguments", function () {
			this.expects ( _.sprintf ( 'a quick %s jumped over a lazy %s', 'dog' ) )
				.toBe ('a quick dog jumped over a lazy %s');
		} );
		it ( "leaves extra %s if there are too few arguments", function () {
			this.expects ( _.sprintf ( 'a quick %s jumped over a %s cat', 'dog' ) )
				.toBe ('a quick dog jumped over a %s cat');
		} );
		it ( "appends extra arguments with a space", function () {
			this.expects ( _.sprintf ( 'a %s cat %s over a quick', "lazy", 'flew', 'horse' ) )
				.toBe ('a lazy cat flew over a quick horse');
		} );
	} );
	describe ( "unravel", function () {
		beforeEach ( function () {
			this.obj = {a:{b:{c:{d:3}}}};
		} );
		it ( "returns a value at the objects path", function () {
			this.expects ( _.unravel (this.obj,'a.b.c.d') ).toBe(3);
		} );
		it ( "returns undefined if the chain is too short", function () {
			this.expects ( _.unravel ( this.obj, 'a.b.c.d.e' ) ).not.toBeDefined ();
		} );
		it ( "returns undefined if a chain link is not an object", function () {
			this.obj.a.b.c = 5;
			this.expects ( _.unravel ( this.obj, 'a.b.c.d' ) ).not.toBeDefined ();
		} );
	} );
	describe ( "set", function () {
		it ( "sets a field", function () {
			var x = {};
			_.set(x,'foo','baz');
			this.expects ( x.foo ).toBe ('baz');
		} );
		it ( "calls a setter", function () {
			var z;
			var x = {foo:function (v) {
				z = v;
			}};
			_.set(x,'foo','baz');
			this.expects ( z ).toBe ('baz');
		} );
	} );
	describe ( "get", function () {
		it ( "gets a field", function () {
			var x = {foo:'bar'};
			this.expects ( _.get(x,'foo') ).toBe ('bar');
		} );
		it ( "calls a getter", function () {
			var x = {foo:function(){return 'bar'}};
			this.expects ( _.get ( x, 'foo' ) ).toBe('bar');
		} );
	} );
	describe ( "any", function () {
		it ( "iterates using the passed function breaking on the first truthy result", function () {
			var x = _.any([1,2,3,4], function(item){return item==3});
			this.expects (x ).toBe(true);
		} );
		it ( "accepts a field name instead of an iterator, " +
			"returning the value if a member contains a truthy value for this field", function () {
			var found = _.any ( [
				{a : false},
				{a : 3},
				{}
			], 'a' );
			this.expects ( found ).toBeTruthy();
		} );
		it ( "accepts a field name instead of an iterator, " +
			"returning the false if no member contains a truthy value for this field", function () {
			var found = _.any ( [
				{a : false},
				{a : null},
				{}
			], 'a' );
			this.expects ( found ).toBeFalsy();
		} );
	} );
} );
