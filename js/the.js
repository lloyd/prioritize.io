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

function renderSurvey(id) {
  var r = firebase.child("surveys").child(id);
  r.on('value', function(snapshot) {
    var survey = snapshot.val();
    console.log(survey);

    $("section.take_survey").fadeIn(700);
    var EDGES = [];

    // a function to present the user with a choice
    function choose(a, b) {
      $(".take_survey .first").off('click');
      $(".take_survey .second").off('click');
      $(".take_survey .first").text(survey.questions[a]).on('click', function() {
        EDGES.push([a,b]);
        chosen();
      });
      $(".take_survey .second").text(survey.questions[b]).on('click', function() {
        EDGES.push([b,a]);
        chosen();
      });
    }

    function chosen() {
      console.log(EDGES);
      var q = nextQuestion(EDGES, survey.questions.length);
      console.log(q);
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

function renderResponses(id) {
  console.log(id);
  var r = firebase.child("surveys").child(id);
  r.on('value', function(snapshot) {
    var survey = snapshot.val();
    r.off();
    console.log(survey);
    $("section.view_survey .surveyName").text(survey.title);
    $("section.view_survey").fadeIn(700);
  });
}

function userHasTakenSurvey(surveyId, cb) {
  var r = firebase.child("responses").child(surveyId).child(currentUser.id);
  r.on('value', function(snapshot) {
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
    $("section.survey_noauth").fadeIn(700);
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
      "section.view_survey"
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
      "view": "take"
    });
  }

  router.init();
});
