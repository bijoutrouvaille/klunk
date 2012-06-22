/**
 * Author: Bijou Trouvaille
 * Created using JetBrains PhpStorm
 * Date: 6/19/12
 * Time: 10:26 PM
 */

var klunk = require ( '../klunk' );
var _ = klunk._;
describe ( "klunk's it", function () {
	it ( "passes", function () {
		this.expects ( true ).toBe ( true )
	} );
	it ( "also passes", function () {
		this.expects ( true ).toBe ( true )
	} );
} ) ( {callback : function () {

	var x = 3;

}} );
describe ( "klunk suite", function () {

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
		beforeEach ( function () {
			this.dinoflagellate = "noctiluca";
			this.count = ++count;
			this.count2 = this.count2 ? this.count2 + 1 : 1;
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
			beforeEach ( function () {
				this.dinoflagellate = this.dinoflagellate.toUpperCase ()
			} );
			it ( "runs before the child beforeEach", function () {
				this.expects ( this.dinoflagellate ).toBe ( "NOCTILUCA" );
			} );
		} );
	} );
} );

describe ( "klunk topic", function () {
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


(function synchroklunk () {

	var count = '';
	describe ( "klunk horizontal synchronicity", function () {

		topic ( function ( done ) {
			_.delay ( function () {
				count += '0';
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
		it ( "finishes second", function ( done ) {
			_.delay ( function () {
				count += '2';
				this.expects ( this.fore ).toBe ( true );
				this.aft = true;
				done ()
			}, 20, this )
		} );
		it ( "finishes first", function ( done ) {
			_.delay ( function () {
				count += '1';
				this.expects ( this.fore ).toBe ( true );
				this.aft = true;
				done ()
			}, 10, this )
		} );
		describe ( "nested spec", function () {
			it ( "finish third", function ( done ) {
				_.delay ( function () {
					count += '3';
					this.expects ( this.fore ).toBe ( true );
					this.aft = true;
					done ()
				}, 5, this )
			} );
		} );

	} ) ( { callback : function () {
		describe ( "klunk horizontal synchronicity analysis", function () {
			it ( "completed all tests", function () {
				this.expects ( count ).toBe ( '0123' )
			} );
		} ) ();

	} } );
} () );

describe ( "klunk serial execution", function () {
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
	it ( "finishes third test third", function ( done ) {
		_.delay ( function () {
			this.expects ( this.topic.count++ ).toBe ( 2 );
			done ()
		}, 1, this );
	} );

} )
	( {serial : true} )
;



describe ( "klunk underscore", function () {
	var _ = klunk._;
	describe ( "extend", function () {
		it ( "copies onto the first object", function () {
			var obj = {a:1};
			_.extend ( obj, {b : 2}, {c : 3} );
		} );
	} );
} );

klunk.run();