const graph = require('./tsort.js'),
mocha = require('mocha'),
should = require('should');

describe('total sorting', function() {
  it('should work', function(done) {
    // to test basic sorting correctness, we create a shuffled array of numbers, and
    // then answer questions until complete, and verify that the result is a properly
    // sorted array
    var n = null;
    var e = []
    var x = new Date();
    while (n = graph.nextQuestion(e, 20)) {
      if (n[0] < n[1]) { e.push([n[1], n[0]]); }
      else { e.push(n); }
    }
    var a = graph.tsort(e, 20);

    for (var i = 0; i < a.length - 1; i++) {
      (a[i]).should.equal(i);
    }
    // there must be at least 20 edges in the graph, and less than 200
    (e.length).should.be.above(19);
    (e.length).should.be.below(200);

    done();
  });
});

describe('partial sorting of the top five', function() {
  it('should work', function(done) {
    // to test basic sorting correctness, we create a shuffled array of numbers, and
    // then answer questions until complete, and verify that the result is a properly
    // sorted array
    var n = null;
    var e = []
    var x = new Date();
    while (n = graph.nextQuestion(e, 20, 5)) {
      if (n[0] < n[1]) e.push([n[1], n[0]]);
      else e.push(n);
    }
    var a = graph.tsort(e, 20);

    for (var i = 0; i < 5; i++) {
      (a[i]).should.equal(i);
    }
    // there must be at least 20 edges in the graph, and less than 200
    (e.length).should.be.above(19);
    (e.length).should.be.below(200);

    done();
  });
});

describe('low level analysis', function() {
  var analysis = graph.analysis([[1,2],[1,3],[2,6],[3,4],[4,5],[5,6],[0,6]], 7);
  it('should properly determine maxPath', function(done) {
    analysis[1].maxPath.should.equal(4);
    analysis[6].maxPath.should.equal(0);
    analysis[6].deps.should.equal(6);
    analysis[2][3].should.be.false;
    analysis[2][4].should.be.false;
    analysis[2][5].should.be.false;
    analysis[2][6].should.be.true;
    analysis[0][6].should.be.true;
    done();
  });
});

