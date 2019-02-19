$(document).ready(function () {
  $('#submitBtn').click(function () {
    var form = $('form')[0]; // You need to use standard javascript object here
    var formData = new FormData(form);
    var filename = null;
    $.ajax({
      url: 'http://localhost:3000/uploadfile',
      data: formData,
      type: 'POST',
      contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
      processData: false // NEEDED, DON'T OMIT THIS
    }).done(function (data) {
        console.log(data);
        // filename = data
        $.ajax({
          url: 'http://localhost:3000/getfile/' + data,
          type: 'GET',
          contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
          processData: false // NEEDED, DON'T OMIT THIS
        }).done(function (json) {
            $('#fileUploadDiv').css('display', 'none')
            console.log(json);

            let data = [];
            var scores = [];
            var mean = -1;
            var stdDev = -1;

            for (let i in json) {
              scores.push(parseInt(json[i].score));
            }

            mean = calculateMeanScore(scores);
            console.log(mean);

            stdDev = standardDeviation(scores);
            console.log(stdDev);

            for (let i = 0; i < json.length; i++) {
              var new_data = {};
              new_data.sid = json[i].sid;
              new_data.score = json[i].score;
              new_data.value = NormalDensityZx(scores[i], mean, stdDev);
              new_data.grade = '';
              data.push(new_data);
            }

            am4core.useTheme(am4themes_animated);
            var chart = am4core.create('chartdiv', am4charts.XYChart);
            console.table(data);
            chart.data = data;

            var xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
            xAxis.dataFields.category = 'score';

            var yAxis = chart.yAxes.push(new am4charts.ValueAxis());
            yAxis.dataFields.value = 'value';
            yAxis.min = 0;
            yAxis.max = 0.1;

            let series = chart.series.push(new am4charts.LineSeries());
            series.dataFields.categoryX = 'score';
            series.dataFields.valueY = 'value';
            series.tooltipText = '{valueY.value}';

            var bullet = series.bullets.push(new am4charts.Bullet());
            var square = bullet.createChild(am4core.Rectangle);
            square.width = 10;
            square.height = 10;

            chart.cursor = new am4charts.XYCursor();
            chart.cursor.lineX.stroke = am4core.color("#006eff");
            chart.cursor.lineX.strokeWidth = 3;
            chart.cursor.lineX.strokeOpacity = 0.3;
            chart.cursor.lineX.strokeDasharray = "";
            // disabling lineY
            chart.cursor.lineY.disabled = true;
            chart.cursor.behavior = 'selectX';
            chart.cursor.events.on('selectended', function (ev) {
              var range = ev.target.xRange;
              var axis = ev.target.chart.xAxes.getIndex(0);
              var from = axis.getPositionLabel(axis.toAxisPosition(range.start));
              var to = axis.getPositionLabel(axis.toAxisPosition(range.end));

              // alert("Selected from " + from + " to " + to);

              var random_color = randomColor();
              console.log(random_color);
              let colorRange = axis.createSeriesRange(series);
              colorRange.category = from;
              colorRange.endCategory = to;
              colorRange.contents.stroke = am4core.color(random_color);
              colorRange.contents.fill = am4core.color(random_color);
              colorRange.contents.fillOpacity = 0.5;

              chart.validateData();
            });

            let scrollbarX = new am4charts.XYChartScrollbar();
            scrollbarX.series.push(series);
            chart.scrollbarX = scrollbarX;
          });
      });
  })
})

function calculateMeanScore (scores) {
  var total = 0.0;
  for (var i = 0; i < scores.length; i++) {
    total += scores[i];
  }

  return (total / scores.length);
}

function standardDeviation (scores) {
  var avg = calculateMeanScore(scores);

  var squareDiffs = scores.map(function (value) {
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = calculateMeanScore(squareDiffs);
  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function NormalDensityZx( x, Mean, StdDev ) {
  var a = x - Mean;
  return Math.exp( -( a * a ) / ( 2 * StdDev * StdDev ) ) / ( Math.sqrt( 2 * Math.PI ) * StdDev );
}

function randomColor(){
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++ ) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
