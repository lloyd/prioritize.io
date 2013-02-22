// http://en.wikipedia.org/wiki/Topological_sorting
function tsort(E, num) {
  //+ Jonas Raoni Soares Silva
  //@ http://jsfromhell.com/array/shuffle [v1.0]
  function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  };

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

  return L;
}

// returns null if the edges result in a fully unique sorting, otherwise returns a
// pair of entries that we would like the answer to.
function nextQuestion(E, num, maxRelevant) {
  // if a maximum rank that is relevant was not specified, then
  // we'll set maxRelevant to a large number so we consider all
  // items relevant and seek a total ordering (lots of questions)
  if (!maxRelevant) maxRelevant = 77777;

  var sorted = tsort(E, num);

  // find the maximum rank an item can have given the current edge set
  // (useful to determine wether it's relevant and we should ask more
  // questions about it)
  function minRank(E, num) {
    var lengths = E.map(function(edge) {
      if (edge[1] === num) return 1 + minRank(E, edge[0]);
      else return 0;
    });
    return lengths.sort()[lengths.length - 1] || 0;
  }

  function hasEdge(n, m) {
    for (var i = 0; i < E.length; i++) {
      if (E[i][0] == n && E[i][1] == m ||
          E[i][1] == n && E[i][0] == m) return true;
    }
    return false;
  }

  // each consecutive node in the graph should be conected by an edge
  for (var i = 0; i < sorted.length - 1; i++) {
    if (!hasEdge(sorted[i], sorted[i+1]) &&
        minRank(E, sorted[i]) < maxRelevant &&
        minRank(E, sorted[i + 1]) < maxRelevant)
      return [sorted[i], sorted[i+1]];
  }

  return null;
}

function allPossibleQuestions(E, num) {
  // generate all questions
  var apq = {};
  for (var i = 0; i < num - 1; i++) {
    apq[i] = {};
    for (var j = i+1; j < num; j++) {
      apq[i][j] = true;
    }
  }

  function prune(from, to) {
    console.log('prune', from, to);
    // remove this edge
    if (from > to) delete apq[to][from];
    else delete apq[from][to];

    // look for derived edges
    E.forEach(function(e) {
      if (e[0] == to) {
        prune(from, e[1]);
      }
    });
  }
  // prune those that add no information
  E.forEach(function(e) {
    prune(e[0], e[1]);
  });

  // each consecutive node in the graph should be conected by an edge
  var qs = [];
  Object.keys(apq).forEach(function(k) {
    Object.keys(apq[k]).forEach(function(v) {
      qs.push([k,v]);
    });
  });

  return qs;
}

function findBestQuestion(E, num, depth) {
  depth = depth || 0;
  // evaluate all possible moves and pick the one with the best worst case
  var qs = allPossibleQuestions(E, num);

  if (!qs.length) return [null, depth];

  var costs = [];

  var allqs = [];
  qs.forEach(function(q) {
    var cost;

    // may answer A, or may answer B
    var Ep = E.slice(0);
    Ep.push(q);
    cost = allPossibleQuestions(Ep, num).length;

    var Ep = E.slice(0);
    Ep.push([q[1], q[0]]);
    var cp = allPossibleQuestions(Ep, num).length;
    if (cp < cost) cost = cp;
    costs.push([q, cost]);
  });
  costs = costs.sort(function(a, b) {
    return a[1] > b[1];
  });

  return costs[0];
}

/*console.log(findBestQuestion(
  [],
  5,
  0
  ));
*/

// figure out how many moves it takes with 20 items
var numQs = 0;
var ITERS = 50;
for (var i = 0; i < ITERS; i++) {
  process.stdout.write(".");
  var edges = [];
  var nq;
  while (nq = findBestQuestion(edges, 10)[0]) {
//  while (nq = nextQuestion(edges, 20)) {
    numQs++;
    if (Math.random() > .5) nq = [nq[1], nq[0]];
    edges.push(nq);
  }
}
numQs /= ITERS;
console.log("avg # of qs asked", numQs);
