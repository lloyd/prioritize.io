var currentState = null;
var currentUser = null;

var firebaseURL = 'https://prioritizeio.firebaseio.com';
var firebase = new Firebase(firebaseURL);

function randomSurveyID() {
  var str = "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i=0; i < 10; i++) {
    str += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return str;
};

// for longer surveys, ignore all but the top MAX_RELEVANT choices
// This means ask fewer questions about the unimportant stuff, and
// ignore relative ordering of stuff that's not in the top 5
// (psychological magic!  it's awesome!).
var MAX_RELEVANT = 5;

$(document).ready(function() {
  // when get started is clicked
  $(".get_started").click(function(e) {
    e.preventDefault();
    if (currentUser) {
      document.location.hash = "#/create";
    } else {
      document.location.hash = "#/signin";
    }
  });

  // when sign-in is clicked
  $(".signin").click(function(e) {
    e.preventDefault();
    firebaseAuth.login("persona", { rememberMe: true });
  });

  // when the user submits ye' form
  $("section.create form").submit(function(e) {
    e.preventDefault();
  });

  // when an item is added in create view
  $("section.create .add-item").on('click', function() {
    var ta = $(".create form textarea");
    var thing = $("<div/>").text(ta.val());
    $("section.create .items").append(thing);
    ta.val("").focus();
  });

  // when the user clicks on 'complete survey'
  $("section.create .complete_survey").on('click', function(e) {
    e.preventDefault();
    // first, let's generate a JSON blob
    var blob = {
      title: $(".create .title").val() || "untitle survey",
      questions: $.map($(".create .items > div"), function(x) { return $(x).text(); })
    };

    // now generate a random identifier.  collisions never happen.
    var id = randomSurveyID();

    firebase.child("surveys").child(id).set(blob, function(err) {
      if (err) {
        $('<div class="alert alert-error"></div>').text(err).appendTo($(".create > div"));
      } else {
        // we did it!  let's restore the DOM and transition to success
        $(".create .items").empty();
        // update the survey_url
        var url = document.location.origin + "/#/survey/" + id;
        $("a.survey_url").text(url).attr('href', url);

        // go be successful
        document.location.hash = "#/success";
      }
    });
  });
  if (!document.location.hash) document.location.hash = "#/";
});

function getSurvey(id, cb) {
  var r = firebase.child("surveys").child(id);
  r.once('value', function(snapshot) {
    cb(snapshot.val());
  });
}

function renderSurvey(id) {
  getSurvey(id, function(survey) {
    $("section.take_survey").fadeIn(700);
    var EDGES = [];

    // a function to present the user with a choice
    function choose(a, b) {
      $(".take_survey .first").off('click');
      $(".take_survey .second").off('click');
      $(".take_survey .first").text(survey.questions[a]).on('click', function() {
        EDGES.push([b,a]);
        chosen();
      });
      $(".take_survey .second").text(survey.questions[b]).on('click', function() {
        EDGES.push([a,b]);
        chosen();
      });
    }

    function chosen() {
      var q = nextQuestion(EDGES, survey.questions.length, MAX_RELEVANT);
      if (!q) {
        // now we know the preferences of this user!
        var results = tsort(EDGES, survey.questions.length);
        firebase.child("responses").child(id).child(currentUser.id).set(results);
        document.location.hash = "#/view/" + id;
      }
      else choose(q[0], q[1]);
    }

    chosen();
  });
}

function analyze(survey, responses, limit) {
  var ranking = [];

  // build up the ranking list
  $.each(survey.questions, function(num, q) {
    ranking.push({
      // summed score
      score: 0,
      // question text
      question: q,
      // actual scores
      scores: [],
      // highest vote and caster of said vote
      advocate: null
    });
  });

  // now iterate through each response
  $.each(responses, function(k, v) {
    // respect limit
    if (limit && !$.inArray(k, limit)) return;

    // assign scores
    for (var i = 0; i < survey.questions.length; i++) {
      var score = i < MAX_RELEVANT ? MAX_RELEVANT - i : 0;
      var item = v[i];

      ranking[item].score += score;

      ranking[item].scores.push(score);

      if ((!ranking[item].advocate || score > ranking[item].advocate.score) &&
          score > (MAX_RELEVANT / 2)) {

        ranking[item].advocate = {
          who: k,
          score: score
        };
      }
    }
  });

  var numRespondees = $.grep(Object.keys(responses), function(x) {
    return !limit || $.inArray(x, limit);
  }).length;

  ranking = ranking.sort(function(a, b) {
    return a.score < b.score ? 1 : -1;
  });

  return ranking;
}

function getImg(id) {
  var url = 'http://www.gravatar.com/avatar/';
  url += CryptoJS.MD5(id.replace(/,/g, '.'));
  url += '?s=48';
  var name = id.replace(/@.*$/, '@');
  return $("<img/>").attr('src', url).attr('title', name).attr('alt', name);
}

function renderResponses(id) {
  getSurvey(id, function(survey) {
    $("section.view_survey .surveyName").text(survey.title);
    $("section.view_survey").fadeIn(700);

    // now!  let's pull all the responses
    var r2 = firebase.child("responses").child(id);
    r2.on('value', function(sshot) {
      var responses = sshot.val();
      // this can be called multiple times, it's got realtime update.  freaking neat, eh?
      // let's first clear old data -
      $("section.view_survey tbody.ranking").empty();
      $("section.view_survey .faces").empty();
      console.log(JSON.stringify(responses));


      var sampleData = {"ckarlof@mozilla,com":[0,10,3,4,2,12,14,9,6,8,16,7,1,5,15,13,11],"dcallahan@mozilla,com":[0,15,8,7,6,1,5,13,12,9,4,3,16,2,10,14,11],"francois@mozilla,com":[6,0,5,16,9,14,15,1,3,8,4,7,11,2,13,12,10],"jhirsch@mozilla,com":[6,0,3,1,8,5,15,13,10,14,4,7,12,2,9,11,16],"jparsons@mozilla,com":[2,1,11,4,7,13,8,3,0,6,5,15,10,16,12,14,9],"jrgm@mozilla,com":[6,0,3,7,13,5,2,15,1,10,11,4,8,12,14,9,16],"kparlante@mozilla,com":[0,3,11,14,4,15,16,13,1,2,6,8,7,5,12,9,10],"kthiessen@mozilla,com":[0,8,7,3,15,6,10,2,1,12,4,5,16,11,14,9,13],"lloyd@hilaiel,com":[4,3,5,14,1,15,8,10,0,16,6,9,13,12,11,7,2],"stomlinson@mozilla,com":[0,15,3,6,1,5,10,16,7,11,12,4,8,13,9,2,14]};

      var r = analyze(survey, responses);

      $("section.view_survey .howMany").text(Object.keys(responses).length);
      $.each(responses, function(k,v) {
        $("section.view_survey .faces").append(getImg(k));
      });

      var i = 1;
      $.each(r, function(k, x) {
        $("<tr/>")
          .append($("<td/>").text(i++))
          .append($("<td/>").text(x.question))
          .append($("<td/>").text(x.score))
          .append($("<td/>").append(x.advocate ? getImg(x.advocate.who) : $("<span/>")))
          .appendTo($("section.view_survey tbody.ranking"));
      });
    });
  });
}

function userHasTakenSurvey(surveyId, cb) {
  var r = firebase.child("responses").child(surveyId).child(currentUser.id);
  r.once('value', function(snapshot) {
    cb(snapshot.val());
  });
}

var router = Router({
  '/' : function() {
    $("section.main").fadeIn(700);
  },
  '/signin' : function() {
    $("section.create_noauth").fadeIn(700);
  },
  '/create': function() {
    $("section.create").fadeIn(700);
  },
  '/success': function() {
    $("section.create_success").fadeIn(700);
  },
  '/survey/:surveyId': function(surveyId) {
    getSurvey(surveyId, function(survey) {
      if (!survey) $("section.survey_notfound").fadeIn(700);
      else {
        $(".surveyTitle").text(survey.title);
        $("section.survey_noauth").fadeIn(700);
      }
    });
  },
  '/take/:surveyId': function(surveyId) {
    // if this user has taken this survey, then we'll send them to view, otherwise to take/
    userHasTakenSurvey(surveyId, function(r) {
      if (r) document.location.hash = "#/view/" + surveyId;
      else renderSurvey(surveyId);
    });
  },
  '/view/:surveyId': function(surveyId) {
    userHasTakenSurvey(surveyId, function(r) {
      if (!r) document.location.hash = "#/take/" + surveyId;
      else renderResponses(surveyId);
    });
  }
});

router.configure({
  before: function() {
    // what state are we transitioning to
    currentState = document.location.hash.split('/')[1] || 'main';

    $([
      "section.main",
      "section.create_noauth",
      "section.create",
      "section.create_success",
      "section.survey_noauth",
      "section.take_survey",
      "section.view_survey",
      "section.survey_notfound"
    ].join(",")).hide();

  },
  notfound: function() {
    document.location.hash = '#/';
  }
});

var firebaseAuth = new FirebaseAuthClient(firebase, function(error, user) {
  currentUser = user;

  function reroute(map) {
    Object.keys(map).forEach(function(key) {
      if (document.location.hash.indexOf(key) !== -1) {
        document.location.hash = document.location.hash.replace(key, map[key]);
      };
    });
  }

  if (user) {
    reroute({
      'signin': 'create',
      'survey': 'take'
    });
  } else {
    reroute({
      "create": "signin",
      "take": "survey",
      "view": "survey"
    });
  }

  router.init();
});
