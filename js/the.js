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

  // closing the contention modal
  $("section.contention button.close").click(function() {
    $("section.contention").fadeOut();
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
      num: num,
      // summed score
      score: 0,
      // question text
      question: q,
      // actual scores
      scores: [],
      // highest vote and caster of said vote
      advocate: null,
      // a score on how contentious this issue is
      contention: 0
    });
  });

  // now iterate through each response
  $.each(responses, function(k, v) {
    // respect limit
    if (limit && $.inArray(k, limit) === -1) return;

    // assign scores
    for (var i = 0; i < survey.questions.length; i++) {
      var score = i < MAX_RELEVANT ? MAX_RELEVANT - i : 0;
      var item = v[i];

      ranking[item].score += score;

      ranking[item].scores.push({ who: k, score: score });

      if ((!ranking[item].advocate || score > ranking[item].advocate.score) &&
          score > (MAX_RELEVANT / 2)) {

        ranking[item].advocate = {
          who: k,
          score: score
        };
      }
    }
  });

  ranking = ranking.sort(function(a, b) {
    return a.score < b.score ? 1 : -1;
  });

  // now determine contention score given variance
  for (var i = 0; i < ranking.length; i++) {
    var scores = ranking[i].scores;
    var mean = ranking[i].score / scores.length;
    var v = 0;
    for (var j = 0; j < scores.length; j++) {
      var delta = scores[j].score - mean;
      ranking[i].contention += delta * delta;
    }

    ranking[i].contention = Math.sqrt(ranking[i].contention / scores.length);
    ranking[i].contention = (ranking[i].contention * 50).toFixed(0);
  }

  return ranking;
}

function getImg(id) {
  var url = 'http://www.gravatar.com/avatar/';
  url += CryptoJS.MD5(id.replace(/,/g, '.'));
  url += '?s=48';
  var name = id.replace(/@.*$/, '@');
  return $("<img/>").attr('src', url).attr('title', name).attr('alt', name).addClass('face')
    .attr('full_id', id);
}

function renderResponses(id) {
  getSurvey(id, function(survey) {
    $("section.view_survey .surveyName").text(survey.title);
    $("section.view_survey").fadeIn(700);


    var r2 = firebase.child("responses").child(id);
    r2.on('value', function(sshot) {
      var responses = sshot.val();

      // this can be called multiple times, it's got realtime update.  freaking neat, eh?
      // let's first clear old data -
      $("section.view_survey .faces").empty();

      $("section.view_survey .howMany").text(Object.keys(responses).length);

      $.each(responses, function(k,v) {
        getImg(k)
          .appendTo($("section.view_survey .faces"))
          .on('click', function() {
            $(".faces").addClass("limiting");
            if ($(this).hasClass('include')) $(this).removeClass('include');
            else $(this).addClass('include');
            update();
          });
      });

      function update() {
        var limit = null;
        $("img.face.include").each(function(num, node) {
          if (!limit) limit = [];
          limit.push($(node).attr('full_id'));
        });

        $("section.view_survey tbody.ranking").empty();

        var i = 1;
        $.each(analyze(survey, responses, limit), function(k, x) {
          // based on contention score let's colorize the contention node
          var cNode = $("<td/>").text(x.contention);
          var level = "contention_" + (x.contention / 23.0).toFixed(0);
          cNode.addClass(level).addClass('contention');

          // now clicking on this cNode will show where everyone falls
          cNode.on('click', function() {
            $("section.contention div.contention_view > div").empty();
            var n = Number($(this).parent().attr('num'));

            // now let's all all the respondee's pretty faces where they belong
            x.scores.forEach(function(x) {
              $("div.contention_view > div:nth-child(" + (x.score+1) + ")")
                .append(getImg(x.who));
            });

            $("section.contention").fadeIn(300);
          });

          $("<tr/>").attr('num', x.num)
            .append($("<td/>").text(i++))
            .append($("<td/>").text(x.question))
            .append($("<td/>").text(x.score))
            .append($("<td/>").append(x.advocate ? getImg(x.advocate.who) : $("<span/>")))
            .append(cNode)
            .appendTo($("section.view_survey tbody.ranking"));
        });
      }

      update();
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
      else  renderResponses(surveyId);
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
