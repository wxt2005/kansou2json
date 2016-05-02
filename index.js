var jsdom = require('jsdom');
var fs = require('fs');
var readline = require('readline');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prefixNum(num) {
    num = num.toString();
    if (num.length < 2) {
        num = '0' + num;
    }
    return num;
}

function addWeekDay(old, addDays) {
    old += addDays;
    if (old >= 7) {
        old -= 7;
    }
    return old;
}

function buildBgm(conf) {
    var def = {
        titleCN: '',
        titleJP: '',
        titleEN: '',
        officalSite: '',
        weekDayJP: 0,
        weekDayCN: 0,
        timeJP: '',
        timeCN: '',
        onAirSite: [],
        newBgm: false,
        showDate: '',
        bgmId: 0
    };
    var result = {};
    var item = '';

    for (item in def) {
        result[item] = def[item];
    }
    for (item in conf) {
        result[item] = conf[item];
    }
    return result;
}

var resultArr = {};
var weekDayJpList = ['日', '月', '火', '水', '木', '金', '土'];
var season = ['winter', 'spring', 'summer', 'autumn'];

function monthToSeason(month) {
    return season[Math.floor((month - 1) / 3)];
}

function jpToCn(timeJP, showDate) {
    var tempDate = null;
    var weekDayCN = 0;

    showDate = showDate.split('/');
    timeJP = timeJP.split(':');
    if (+timeJP[0] >= 24) {
        timeJP[0] = +timeJP[0] - 24;
        showDate[2] = +showDate[2] + 1;
    }
    tempDate = new Date(showDate.join('/') + ' ' + timeJP.join(':') + ' GMT+0900');
    if (tempDate.getHours() <= 23) {
        weekDayCN = tempDate.getDay();
    } else {
        weekDayCN = addWeekDay(tempDate.getDay(), 1);
    }
    return {
        timeJP: prefixNum(tempDate.getHours()) + prefixNum(tempDate.getMinutes()),
        weekDayJP: tempDate.getDay(),
        showDate: tempDate.getFullYear() + '-' + prefixNum(tempDate.getMonth() + 1) + '-' + prefixNum(tempDate.getDate()),
        weekDayCN: weekDayCN
    };
}



rl.question('Please input year and season, like 1401 or "current": ', function(str) {
    var fileName,
        year,
        month,
        season,
        url = '';

    if (str === 'current') {
        url = 'http://www.kansou.me';
        rl.question('Input file name(like 1505): ', function(str) {
            fileName = str;
            process();
        });
    } else if (/^\d{4}$/.test(str)) {
        year = str.slice(0, 2);
        month = str.slice(2);
        season = monthToSeason(parseInt(month, 10));
        fileName = str;
        url = 'http://www.kansou.me/archive/20' + year + '_' + season + '.html';
        process();
    } else {
        console.log('Wrong input');
        rl.close();
        return;
    }

    function process() {
        jsdom.env(url, function(err, window) {
            var $ = require('jquery')(window);
            var jsonString = '';

            var $targetRows = $('table').eq(0).find('tr');

            $targetRows.each(function(index, ele) {
                var $ele = $(ele),
                    result = null;
                var showDate = '',
                    weekDayJP = '',
                    titleJP = '',
                    officalSite = '',
                    timeJP = '';
                var formatedDate = null;

                if (index === 0) {
                    return;
                }

                titleJP = $ele.find('td:eq(1) a').text();
                officalSite = $ele.find('td:eq(1) a').attr('href');
                showDate = $ele.find('td:eq(0)').text().slice(0, -3);
                weekDayJP = $ele.find('td:eq(0)').text().slice(-2, -1);
                timeJP = $ele.find('td:eq(2)').html().split('\n')[1].match(/\d\d?:\d\d/i);
                if (timeJP) {
                    formatedDate = jpToCn(timeJP[0], showDate);
                } else {
                    weekDayJP = weekDayJpList.indexOf(weekDayJP);
                    formatedDate = {
                        timeJP: '',
                        weekDayJP: weekDayJP,
                        showDate: showDate.replace(/\//g, '-'),
                        weekDayCN: addWeekDay(weekDayJP, 1)
                    };
                }

                result = buildBgm({
                    titleJP: titleJP,
                    officalSite: officalSite,
                    showDate: formatedDate.showDate,
                    weekDayJP: formatedDate.weekDayJP,
                    timeJP: formatedDate.timeJP,
                    weekDayCN: formatedDate.weekDayCN,
                    newBgm: true
                });
                resultArr[fileName + '_' + (index - 1)] = result;
            });

            jsonString = JSON.stringify(resultArr, null, 2);

            fs.writeFile('bangumi-' + fileName + '.json', jsonString, function(err) {
                if (err) {
                    throw err;
                } else {
                    console.log('Done: saved to %s', 'bangumi-' + fileName + '.json');
                }
                rl.close();
            });
        });
    }
});
