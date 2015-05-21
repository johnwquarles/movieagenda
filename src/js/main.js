var FIREBASE_URL = "https://movieagenda.firebaseio.com/movielist.json";
var FIREBASE_AUTH_URL = "https://movieagenda.firebaseio.com";
var fb = new Firebase(FIREBASE_AUTH_URL);
var API_URL = "http://www.omdbapi.com/?t=";
var $SUBMITBUTTON = $(".submit");
var $TEXTFIELD = $(".textfield");
var $MOVIEINFO = $(".movie-info");
var $MOVIETABLECONTAINER = $(".movie-table-container");
var movie_info_obj;
var poster_url;
var TMDB_API_KEY = "?api_key=3d3efaa01fcce58b6e8758f0f9d9c93d";
var TMDB_SEARCH_URL = "http://api.themoviedb.org/3/search/movie";
var TMDB_POSTER_BASE = "http://image.tmdb.org/t/p/w500";

fb.onAuth(function(authData) {
	if (authData && authData.password.isTemporaryPassword && window.location.pathname !== "/resetpassword/") {
		window.location = "/resetpassword";
	} else if (authData && !authData.password.isTemporaryPassword && window.location.pathname !== "/index/") {
	  window.location = "/index";
	} else if (!authData && window.location.pathname !== "/login/"){
	  window.location = "/login";
	}
	clearLoginForm();
});

if (window.location.pathname === "/index/") {
	tableLoad();
	$('.crumbs-left').append($(`<p>Welcome, ${fb.getAuth().password.email.split("@")[0]}!</p>`))
}

$('.login-page form').submit(function() {
	var email = $('.login-page input[type="email"]').val();
	var password = $('.login-page input[type="password"]').val();

	doLogin(email, password);
	event.preventDefault();
});

$('.doLogout').click(function() {
	fb.unauth();
})

$('.doRegister').click(function(event) {
	event.preventDefault();
	var email = $('.login-page input[type="email"]').val();
	var password = $('.login-page input[type="password"]').val();

	fb.createUser({
		email: email,
		password: password
	}, function(err, userData) {
		if (err) {
			alert(err.toString());
		} else {
			doLogin(email, password);
		}
	});
})

$('.reset-password form').submit(function() {
	var email = fb.getAuth().password.email;
	var oldPw = $('#oldpass').val();
	var newPw = $('#newpass').val();

	fb.changePassword({
		email: email,
		oldPassword: oldPw,
		newPassword: newPw
	}, function(err) {
		if (err) {
			alert(err.toString());
		} else {
			fb.unauth();
		}
	});
	event.preventDefault();
});

$('.doResetPassword').click(function() {
	event.preventDefault();
	var email = $('.login-page input[type="email"]').val();

	fb.resetPassword({
		email: email
	}, function(err) {
		if (err) {
			alert(err.toString());
		} else {
			alert("Please check your email for further instructions.");
		}
	});
});

function doLogin(email, password, callback) {
	fb.authWithPassword({
		email: email,
		password: password
	}, function(err, authData){
		if (err) {
			alert(err.toString());
		} else {
			saveAuthData(authData);
			typeof callback === 'function' && callback(authData);
		}
	});
}

function saveAuthData (authData) {
	$.ajax({
    method: 'PUT',
    url: `${FIREBASE_AUTH_URL}/users/${authData.uid}/profile.json`,
    data: JSON.stringify(authData)
	});
}

function clearLoginForm() {
	$('.login-page input[type="email"]').val('');
	$('.login-page input[type="password"]').val('');
}

//tableLoad();

function getSearchParams() {
  var movie_title = $TEXTFIELD.val();
  var search_params = movie_title.split(" ").join("+");
  return search_params;
}

$SUBMITBUTTON.click(function(event) {
  event.preventDefault();
  var tmdb_search_url = TMDB_SEARCH_URL + TMDB_API_KEY + "&query=" + getSearchParams();
  $.get(tmdb_search_url, setPosterUrl, 'jsonp');
})

function setPosterUrl(obj) {
  if (obj.total_results === 0) {
    $MOVIEINFO.empty();
    $MOVIEINFO.append(makeError());
    setTimeout(function() {
      $(".error").fadeOut(500, function() {
        $(".error").remove();
      })
    }, 3000)
    return false;
  }
  var poster_path = obj.results && obj.results[0] && obj.results[0].poster_path;
  poster_url = TMDB_POSTER_BASE + poster_path + TMDB_API_KEY;
  // have the poster url; now get the rest of the data according to the title as it was return by the
  // object bearing the poster path (to keep consistency between both APIs' search results).
  var request_url = API_URL + (obj.results && obj.results[0] && obj.results[0].original_title.split(" ").join("+"));
  $.get(request_url, addMovieInfo, 'jsonp');
}

$MOVIEINFO.on('click', '.add-button', function(event) {
  event.preventDefault();
  writeToFirebase(movie_info_obj);
})

$MOVIETABLECONTAINER.on('click', 'button', function(event) {
  event.preventDefault();
  deleteFromFirebase($(this).closest('tr').attr('data_id'));
  $(this).closest('tr').fadeOut(500, function() {
    $(this).closest('tr').remove();
    if (!($('td').length)) {
      $('table').remove();
    }
  });
})

$MOVIETABLECONTAINER.on('click', 'img', function(event) {
  event.preventDefault();
  var id = $(this).closest('tr').attr('data_id');
  $.get(`${FIREBASE_AUTH_URL}/users/${fb.getAuth().uid}/movielist/${id}.json`, reClick, "jsonp");
})

// reClick is for reloading stored movies into the movie info view; don't need to rewrite the poster url.
function reClick(obj) {
  movie_info_obj = obj;
  $MOVIEINFO.empty();
  $MOVIEINFO.append(makeMovieInfo(obj));
}

function addMovieInfo(obj) {
  movie_info_obj = obj;
  movie_info_obj.Poster = poster_url;
  $MOVIEINFO.empty();
  $MOVIEINFO.append(makeMovieInfo(obj));
}

function makeError() {
  var $error = $('<div><p>(´Ａ｀。) No results!</p></div>')
  $error.addClass("error");
  return $error;
}

function makeMovieInfo(obj) {
  var $info_container = $('<div></div>');
  $info_container.addClass("info-container");
  var $title = $("<p>" + obj.Title + "</p>");
  var $info = $(makeRatingImgText(obj)+ "<span " + makeMetaRatingText(obj) + "</span><p class='imdb-rating'>" + obj.imdbRating + "</p></span><span>Year: " + obj.Year + "</span>");
  $title.addClass("title");
  var $director = $("<p>Director: " + obj.Director + "</p>");
  var $plot = $("<p>" + obj.Plot + "</p>");
  var $runtime = $("<p>" + obj.Runtime + "</p>");
  var $add_button = $("<button>Add to my list</button>");
  $add_button.addClass("add-button btn btn-lg btn-success pull-right");
  
  var $poster = $("<img src='" + obj.Poster + "'></img>");
  $poster.addClass("pull-left");
  $info_container.append($poster);
  $info_container.append($title).append($info).append($director).append($plot).append($runtime).append($add_button);
  return $info_container;
}

function addToTable(obj, id) {
  if (!($("table").length)) {
    $MOVIETABLECONTAINER.append(makeTableHeader());
  }
  $("table").append(makeTableRow(obj, id));
}

function makeTableHeader() {
  var $table= $("<table></table>");
  $table.addClass("table table-striped");
  var $header_row = $("<tr></tr>");
  var $header_elements = $("<th></th><th>Title</th><th>Year</th><th>Rating</th><th>Metascore</th><th>imdb</th><th></th>");
  $header_row.append($header_elements);
  $table.append($header_row);
  return $table;
}

function makeTableRow(obj, id) {
  var $row = $("<tr></tr>");
  var $poster_td;
  $row.attr("data_id", id || obj.data_id);
  obj.Poster === "N/A" ? $poster_td = $("<td><img src='" + "https://www.utopolis.lu/bundles/utopoliscommon/images/movies/movie-placeholder.jpg" + "'></td>") : $poster_td = $("<td><img src='" + obj.Poster + "'></src>");
  var other_rows = "<td>" + obj.Title + "</td><td>" + obj.Year + "</td><td>";
  other_rows += makeRatingImgText(obj);
  other_rows += "</td><td><p " + makeMetaRatingText(obj) + "</p></td>";
  other_rows += "<td><p class='imdb-rating'>" + obj.imdbRating + "</p></td>";
  other_rows += "<td><button>Watched</button></td>";
  var $other_rows = $(other_rows);
  $other_rows.find("button").addClass("btn btn-lg btn-danger");
  $row.append($poster_td).append($other_rows);
  return $row;
}

function makeMetaRatingText(obj) {
	var return_str = "class='metascore ";
	if (parseInt(obj.Metascore) > 60) {
  	return_str += "meta-positive";
  } else if (parseInt(obj.Metascore) > 39) {
  	return_str += "meta-neutral";
  } else if (parseInt(obj.Metascore) >= 0) {
  	return_str += "meta-negative";
  }
  return_str += "'>"+ obj.Metascore
  return return_str;
}

function makeRatingImgText(obj) {
	if (obj.Rated === "G") {
  	return "<img class='rating-img' src='../images/G.svg'>";
  } else if (obj.Rated === "PG") {
  	return "<img class='rating-img' src='../images/PG.svg'>";
  } else if (obj.Rated === "PG-13") {
  	return "<img class='rating-img' src='../images/PG-13.svg'>";
  } else if (obj.Rated === "R") {
  	return "<img class='rating-img' src='../images/R.svg'>";
  } else if (obj.Rated === "NC-17") {
  	return "<img class='rating-img' src='../images/NC-17.svg'>";
  } else {
  	return "<span>N/A</span>"
  }
}

function writeToFirebase(obj) {
  $.post(`${FIREBASE_AUTH_URL}/users/${fb.getAuth().uid}/movielist.json`, JSON.stringify(obj), function(response) {
    obj.data_id = response.name;
    addToTable(obj);
  })
}

function deleteFromFirebase(id) {
  var deleteUrl = `${FIREBASE_AUTH_URL}/users/${fb.getAuth().uid}/movielist/${id}.json`;
  $.ajax({url: deleteUrl, type: 'DELETE'});
}

function tableLoad() {
  $.get(`${FIREBASE_AUTH_URL}/users/${fb.getAuth().uid}/movielist.json`, function(db_data) {
    db_data && _(db_data).forEach(function(value, key) {
      addToTable(value, key);
    }).value();
  })
}