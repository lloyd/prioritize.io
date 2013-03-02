(function() {
  if (!$) {
    var $ = { map: function(a, f) { return a.map(f); } };
  }
  //+ Jonas Raoni Soares Silva
  //@ http://jsfromhell.com/array/shuffle [v1.0]
  function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  };

  // http://en.wikipedia.org/wiki/Topological_sorting
  var tsort = function(E, num) {
    var L = [];
    var S = [];

    function incomingEdges(n) {
      var cnt = 0;
      for (var i = 0; i < E.length; i++)
        if (E[i][1] == n) cnt++;
      return cnt;
    }

    // find all nodes with no incoming edges, iterate in
    // random order for random results
    var nodes = [];
    for (var i = 0; i < num; i++) nodes.push(i);
    nodes = shuffle(nodes);

    for (var i = 0; i < num; i++) {
      if (!incomingEdges(nodes[i])) S.push(nodes[i]);
    }

    while (S.length) {
      var n = S.pop();
      L.push(n);
      var EN = [];
      for (var j = 0; j < E.length; j++) {
        if (E[j][0] == n) {
          var m = E[j][1];
          if (incomingEdges(m) == 1) S.push(m);
        } else {
          EN.push(E[j]);
        }
      }
      E = EN;
    }

    return L.reverse();
  }

  var analysis = function(E, num) {
    var context = {};
    for (var i = 0; i < num; i++) {
      context[i] = {
        maxPath: 0,
        deps: 0
      };
      for (var j = i+1; j < num; j++) {
        context[i][j] = false;
      }
    }

    function connect(from, to) {
      var orig = to;
      if (from > to) {
        var swp = from;
        from = to;
        to = swp;
      }
      if (!context[from][to]) context[orig].deps++;
      context[from][to] = true;
    }

    function visit(begin, current, depth) {
      var maxPath = 0;
      for (var i = 0; i < E.length; i++) {
        if (E[i][0] != current) continue;
        connect(begin, E[i][1]);
        var mp = visit(begin, E[i][1], depth + 1);
        if (mp > maxPath) maxPath = mp;
      }

      return maxPath || depth;
    }

    for (var i = 0; i < num; i++) {
      context[i].maxPath = visit(i, i, 0);
    }

    return context;
  }


  // Humany description: Given a set of questions and some comparisons from a user,
  // figure out the best question to ask the user next - the two things she should
  // compare to get us to an ordered "top five" list from the questions.
  //
  // So le'ts represent questions and their relationships with an acyclic directed graph...
  //
  // Computery description: Given a set of edges (`E`) in a directed graph consisting of `num` nodes,
  // where we only care about a total ordering for `maxRelevant` nodes, find a pair of nodes
  // between which an edge would have the highest probability of getting us to total ordering
  // of fastest.
  //
  // The basic premise of this algorithm is to always ask the users to compare questions
  // that have no path between them (have not been directly or indirectly compared) and
  // can be *most* important.
  //   1. Sort nodes by longest path (which is the maximum possible rank of the node)
  //   2. Prune nodes with a longest path greater than maxRelevant
  //   3. find the highest ranked two nodes that are not related and return them, or...
  //   4. ...if there are none, we're done
  var nextQuestion = function(E, num, maxRelevant) {
    // if a maximum rank that is relevant was not specified, then
    // we'll set maxRelevant to a large number so we consider all
    // items relevant and seek a total ordering (lots of questions)
    if (!maxRelevant) maxRelevant = 77777;

    // analyze the graph
    var analysis = this.analysis(E, num);

    // prune all nodes that are already ranked lower than the relevance water mark.
    Object.keys(analysis).forEach(function(k) {
      if (analysis[k].maxPath >= maxRelevant) delete analysis[k];
    });

    function connected(a, b) {
      if (a > b) return analysis[b][a];
      else return analysis[a][b];
    }

    // find a pair of nodes that is not ordered

    var keys = shuffle(Object.keys(analysis).map(function(x) { return Number(x) })).sort(function(a,b) {
      return ((analysis[a].maxPath > analysis[b].maxPath) ? 1 : -1);
    });

    for (var i = 0; i < keys.length - 1; i++) {
      for (var j = i+1; j < keys.length; j++) {
        if (!connected(keys[i], keys[j])) {
          return [keys[i], keys[j]];
        }
      }
    }
    return null;
  }

  var target = typeof module === 'object' && module.exports || window ;
  target.nextQuestion = nextQuestion;
  target.tsort = tsort;
  target.analysis = analysis;
})();
