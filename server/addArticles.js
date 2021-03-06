// var Promise = require('bluebird');
var mongoose = require('mongoose');
var dbSetup = require('../database-mongo/index');
    var Article = dbSetup.Article;
var axios = require('axios');
var reference = require('../database-mongo/dictionary');
    var statesList = reference.stateCodeArr;
var configFile = require('../config/config'); // PRIVATE FILE - DO NOT COMMIT!
    var WEBHOSE_API_KEY = configFile.keys['WEBHOSE_API_KEY'];

  var getSearchStr = function(stateCode){
    var fullTextName = reference.dictionary[stateCode].replace(/\s/g, '%20');
    var timeNow = new Date().getTime(); // time in Unix Epoch ms...
    var twoDaysAgo = timeNow - 86400000 - 86400000; // 86400000ms in a day
    return 'http://webhose.io/filterWebContent?token='+
            WEBHOSE_API_KEY +
            '&format=json&ts=' +
            twoDaysAgo +
            '&sort=published&q=is_first%3Atrue%20language%3Aenglish%20published%3A%3E' +
            twoDaysAgo +
            '%20site_type%3Anews%20thread.country%3AUS%20performance_score%3A%3E7%20location%3A%22' +
            fullTextName +
            '%22';
  };

  var clearStateData = function (stateCode) {
    Article.find( {stateCode: stateCode} )
           .remove( () => { console.log( stateCode + ' Cleared from DB'); });
  }

  var getStateData = function (stateCode) {
    var queryString = getSearchStr(stateCode);

    axios.get(queryString)
    .then((result) => {
      var totalResults = result.data.totalResults;
      console.log( totalResults + ' articles rec\'d for ' + stateCode + ' in hose-response');

      if ( totalResults > 0 ){
        clearStateData(stateCode);
      } else {
        console.log('ZERO NEW Articles for ' + stateCode + ', leaving STALE DATA as is.');
      }

      var arrOfArticleObj = result.data.posts;
      arrOfArticleObj.forEach((articleObj) => {
        var inbound = new Article({
          uuid: articleObj.uuid,
          date: articleObj.published,
          stateCode: stateCode,
          text: articleObj.text
        });
        inbound.save( function(err) {
          if (err) { console.error(err); }  //otherwise...
          console.log('saved uuid-', articleObj.uuid);
        });
      });
    })
    .catch( (error) => { console.error(" ERROR!!! For State" + stateCode + "-->", error); } );
  };

  var dailyRefresh = function(){
    // TO REQUEST DATA FOR ALL STATES - COMMENT OUT LINES 64-65, AND UN-COMMENT LINE 66
    var onlyFirstTenStates = statesList.slice(0,9);
    onlyFirstTenStates.forEach( (stateCode,i) => {
    // statesList.forEach( (stateCode,i) => {
      setTimeout(
        function () { getStateData(stateCode) },
        i * 1000
      );
    });
  };

module.exports = dailyRefresh;