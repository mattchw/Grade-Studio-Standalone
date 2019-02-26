$(document).ready(function () {
  am4core.useTheme(am4themes_animated);
  var chart = am4core.create('chartDiv', am4charts.XYChart);
  var scores = [];
  var unselectedScore = [];

  $('#uploadBtn').click(function () {
    var form = $('form')[0]; // You need to use standard javascript object here
    var formData = new FormData(form);
    $.ajax({
      url: 'http://localhost:3000/uploadfile',
      data: formData,
      type: 'POST',
      contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
      processData: false // NEEDED, DON'T OMIT THIS
    }).done(function (data) {
      $('#filename').text(data.inputname)
      $('#filename').val(data.filename)
      $('#fileUploadDiv').css('display', 'none')
      $('#fileSubmitDiv').css('display', 'block')
    })
  })

  $('#submitBtn').click(function () {
        $.ajax({
          url: 'http://localhost:3000/getfile/' + $('#filename').val(),
          type: 'GET',
          contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
          processData: false // NEEDED, DON'T OMIT THIS
        }).done(function (res) {
            $('#chartDiv').css('display', 'block')
            $('#infoTableDiv').css('display', 'block')
            $('#fileSubmitDiv').css('display', 'none')
            console.log(res);

            //bubbleSort(res);
            selectionSort(res);

            let infoTable = [];
            let data = [];

            var mean = -1;
            var stdDev = -1;

            for (let i in res) {
              scores.push(parseInt(res[i].score));
              unselectedScore.push(parseInt(res[i].score));
            }

            mean = calculateMeanScore(scores);
            console.log(mean);

            stdDev = standardDeviation(scores);
            console.log(stdDev);

            for (let i = 0; i < res.length; i++) {
              var new_data = {};
              new_data.sid = res[i].sid;
              new_data.score = res[i].score;
              new_data.value = NormalDensityZx(scores[i], mean, stdDev);
              new_data.grade = '';
              data.push(new_data);
              let infoTableElement = `<tr>
                <th scope="row">${res[i].sid}</th>
                <td></td>
                <td>${res[i].score}</td>
              </tr>`;
              infoTable.push(infoTableElement);
            }
            $('#infoTableDiv tbody').html(infoTable);

            console.log(data);
            chart.data = data;
          });
  })

  var xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
  xAxis.dataFields.category = 'score';
  xAxis.title.text = 'Score';
  xAxis.title.fontWeight = 600;

  var yAxis = chart.yAxes.push(new am4charts.ValueAxis());
  yAxis.dataFields.value = 'value';
  yAxis.min = 0;
  yAxis.max = 0.02;
  yAxis.title.text = 'Standard Deviation';
  yAxis.title.fontWeight = 600;

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
    $('.gradeBtn').off('click');
    var range = ev.target.xRange;
    var axis = ev.target.chart.xAxes.getIndex(0);
    var from = axis.getPositionLabel(axis.toAxisPosition(range.start));
    var to = axis.getPositionLabel(axis.toAxisPosition(range.end));

    console.log("Selected from " + from + " to " + to);
    console.log(unselectedScore);
    var fromIndex = unselectedScore.indexOf(parseInt(from));
    var toIndex = unselectedScore.lastIndexOf(parseInt(to));
    if (unselectedScore.indexOf(parseInt(from)) === -1 || unselectedScore.indexOf(parseInt(to)) === -1) {
      alert('Selected Range Overlapped! Please Try Again.')
    } else {
      $('#gradeModal').modal('show');

      $('.gradeBtn').on('click', function () {
        var infoTable = [];
        var gradeVal = $(this).html();
        for (let i = scores.indexOf(parseInt(from)); i <= scores.indexOf(parseInt(to)); i++) {
          chart.data[i].grade = gradeVal;
        }

        console.table(chart.data);

        unselectedScore.splice(fromIndex, (toIndex - fromIndex + 1));
        console.log(unselectedScore);

        var random_color = randomColor();
        console.log(random_color);
        let colorRange = axis.createSeriesRange(series);
        colorRange.category = from;
        colorRange.endCategory = to;
        colorRange.contents.stroke = am4core.color(random_color);
        colorRange.contents.fill = am4core.color(random_color);
        colorRange.contents.fillOpacity = 0.5;

        for (let i = 0; i < chart.data.length; i++) {
          let infoTableElement = `<tr>
            <th scope="row">${chart.data[i].sid}</th>
            <td>${chart.data[i].grade}</td>
            <td>${chart.data[i].score}</td>
          </tr>`;
          infoTable.push(infoTableElement);
        }
        $('#infoTableDiv tbody').html(infoTable);

        chart.validateData();
        $('#gradeModal').modal('hide')
      });

    }
  });

  let scrollbarX = new am4charts.XYChartScrollbar();
  scrollbarX.series.push(series);
  chart.scrollbarX = scrollbarX;

  chart.exporting.menu = new am4core.ExportMenu();

  $('#clearBtn').click(function () {
    //xAxis.axisRanges.clear();
  })

})

window.onscroll = function () {
  scrollFunction()
};

function scrollFunction () {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    $('#backToTopBtn').css('display', 'block')
  } else {
    $('#backToTopBtn').css('display', 'none')
  }
}

// When the user clicks on the button, scroll to the top of the document
function topFunction () {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

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

function NormalDensityZx (x, Mean, StdDev) {
  var a = x - Mean;
  return Math.exp( -( a * a ) / ( 2 * StdDev * StdDev ) ) / ( Math.sqrt( 2 * Math.PI ) * StdDev );
}

function randomColor () {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++ ) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function bubbleSort (arr) {
   var len = arr.length;
   for (var i = len-1; i >= 0; i--) {
     for (var j = 1; j <= i; j++) {
       if (arr[j-1].score >= arr[j].score) {
           var temp = arr[j-1];
           arr[j-1] = arr[j];
           arr[j] = temp;
        }
     }
   }
   return arr;
}

function selectionSort (arr) {
  var minIdx, temp,
      len = arr.length;
  for (var i = 0; i < len; i++) {
    minIdx = i;
    for (var j = i + 1; j < len; j++) {
       if (parseFloat(arr[j].score) < parseFloat(arr[minIdx].score)) {
          minIdx = j;
       }
    }
    temp = arr[i];
    arr[i] = arr[minIdx];
    arr[minIdx] = temp;
  }
  return arr;
}
