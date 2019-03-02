$(document).ready(function () {
  am4core.useTheme(am4themes_animated);
  var chart = am4core.create('chartDiv', am4charts.XYChart);
  var scores = [];
  var gradeRange = [];

  var mean = -1;
  var stdDev = -1;

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
      $.ajax({
        url: 'http://localhost:3000/getfile/' + $('#filename').val(),
        type: 'GET',
        contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
        processData: false // NEEDED, DON'T OMIT THIS
      }).done(function (res) {
          var settingTableEl = []
          for (let i in Object.keys(res[0])) {
            let settingTableRow = `<tr>
              <th scope="row">${Object.keys(res[0])[i]}</th>
              <td class="">
                <select class="form-control" onchange="selectOnchange(this)">
                  <option>Ignore</option>
                  <option>Student ID</option>
                  <option>Assignment</option>
                  <option>Quiz</option>
                  <option>Midterm</option>
                  <option>Project</option>
                  <option>Final</option>
                  <option>Overall</option>
                </select>
              </td>
              <td>
                <input class="form-control" id="weighting-${i}" disabled="true" type="number" min="1" max="100">
              </td>
            </tr>`
            settingTableEl.push(settingTableRow);
          }
          $('#settingTable tbody').html(settingTableEl);
        });
    })
  })

  $('#resetWeightBtn').click(function () {
    $('table#settingTable tr input').each(function () {
      $(this).val('');
    });
  });

  $('#submitBtn').click(function () {
        $.ajax({
          url: 'http://localhost:3000/getfile/' + $('#filename').val(),
          type: 'GET',
          contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
          processData: false // NEEDED, DON'T OMIT THIS
        }).done(function (res) {
            var tableWeighting = 0;
            $('table#settingTable tr input').each(function () {
              if (isNaN(parseInt($(this).val())) === false) {
                let percentage = parseInt($(this).val());
                tableWeighting += percentage;
              }
            });
            if (tableWeighting > 100) {
              alert('Total weighting over 100%. Please check again.');
            } else if (tableWeighting <= 0) {
              alert('Wrong Weighting! Please Check Again.');
            } else if (tableWeighting !== 100) {
              alert('Toal weighting not equal to 100%. Please check again.');
            } else {
              // var chartData = new Object();
              // var jsonData = {};
              // $('table#settingTable tr th').each(function () {
              //   jsonData[$(this).text]
              // });
              // columnsResult.forEach(function(column) {
              //     var columnName = column.metadata.colName;
              //     jsonData[columnName] = column.value;
              // });
              // viewData.employees.push(jsonData);


              $('#chartDiv').css('display', 'block')
              $('#gradeOption').css('display', 'block')
              $('#infoTableDiv').css('display', 'block')
              $('#fileSubmitDiv').css('display', 'none')
              console.log(res);

              //bubbleSort(res);
              selectionSort(res);

              let infoTable = [];
              let data = [];

              for (let i in res) {
                scores.push(parseInt(res[i].score));
                unselectedScore.push(parseInt(res[i].score));
              }

              mean = calculateMeanScore(scores);
              $('#mean').html(mean);
              console.log(mean);

              stdDev = standardDeviation(scores);
              $('#std').html(stdDev);
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
                  <td>${res[i].score}</td>
                  <td></td>
                </tr>`;
                infoTable.push(infoTableElement);
              }
              $('#overallTable tbody').html(infoTable);

              console.log(data);
              chart.data = data;

              initChart();
            }
          });
  })

  $('#clearBtn').click(function () {
    //xAxis.axisRanges.clear();
  })

  function initChart() {
    var xAxis = chart.xAxes.push(new am4charts.ValueAxis());
    xAxis.dataFields.value = 'score';
    xAxis.strictMinMax = true;
    xAxis.min = -5;
    xAxis.max = 105;
    xAxis.title.text = 'Score';
    xAxis.title.fontWeight = 600;

    var meanRange = xAxis.axisRanges.create();
    meanRange.value = mean;
    meanRange.grid.stroke = am4core.color("#396478");
    meanRange.grid.strokeWidth = 2;
    meanRange.grid.strokeOpacity = 1;
    meanRange.label.text = "Mean";
    meanRange.label.fill = meanRange.grid.stroke;

    var yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.dataFields.value = 'value';
    yAxis.min = 0;
    yAxis.max = 0.02;
    yAxis.title.text = 'Normal Density';
    yAxis.title.fontWeight = 600;

    let series = chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueX = 'score';
    series.dataFields.valueY = 'value';
    series.tooltipText = '{valueY.value}';

    var bullet = series.bullets.push(new am4charts.Bullet());
    var square = bullet.createChild(am4core.Rectangle);
    square.width = 5;
    square.height = 5;

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

      var radioValue = $("input[name='options']:checked").val();

      let newInsert = -1;
      let overlap   = -1;
      let error     = false;
      // check whether it is a new insert of Area
      for (var i in gradeRange) {
        if (gradeRange[i].label.text==radioValue) {
          newInsert = i;
          break;
        }
      }
      if (newInsert>-1){ // it is not new insert. update exisiting area
        console.log("it is not new");
        // check whether it overlaps with other area
        for (var i in gradeRange) {
          // if (i == newInsert){
          //   continue;
          // }
            if((from>=gradeRange[i].value&&from<=gradeRange[i].endValue)||(to>=gradeRange[i].value&&to<=gradeRange[i].endValue)){
              overlap = i;
              break;
            }
        }
        if (overlap>-1) {
          // overlap
          console.log("overlap");
          // check whether range cover other area
          for (var i in gradeRange) {
            if(from<=gradeRange[i].value&&to>=gradeRange[i].endValue){
              error = true;
              break;
            }
          }
          if (error) {
            console.log("not new & overlap but covering other area")
          } else {
            console.log("not new & overlap but not covering other area")
            console.log("newInsert: "+newInsert+" overlap: "+overlap)
            console.log("INSERT")
          }
        } else {
          // not overlap
          error = true;
          console.log("not new but not overlap -> error");
        }
      } else {
        console.log("it is new");
        // check whether it overlaps with other area
        for (var i in gradeRange) {
          if((from>=gradeRange[i].value&&from<=gradeRange[i].endValue)||(to>=gradeRange[i].value&&to<=gradeRange[i].endValue)){
            overlap = i;
            break;
          }
        }
        if (overlap>-1) {
          // overlap
          console.log("new & overlap");
          // check whether range cover other area
          for (var i in gradeRange) {
            console.log("Comparing "+from+" "+gradeRange[i].value+" "+to+" "+gradeRange[i].endValue)
            if(from<=gradeRange[i].value&&to>=gradeRange[i].endValue){
              error = true;
              break;
            }
          }
          if (error) {
            console.log("new & overlap but covering other area")
          } else {
            console.log("new & overlap but not covering other area")
            console.log("INSERT")
          }
        } else {
          // not overlap
          console.log("new but not overlap");
          for (var i in gradeRange) {
            console.log("Comparing "+from+" "+gradeRange[i].value+" "+to+" "+gradeRange[i].endValue)
            if(from<=gradeRange[i].value&&to>=gradeRange[i].endValue){
              error = true;
              break;
            }
          }
          if (error) {
            console.log("new & not overlap but covering other area")
          } else {
            console.log("new & not overlap but not covering other area")
            console.log("newInsert: "+newInsert+" overlap: "+overlap)
            console.log("INSERT")
          }
        }
      }
      // start to update area after checking conditions
      if (error) {
        console.log("do not update the area")
        alert("something went wrong");
      } else {
        if (newInsert>-1&&overlap>-1) {
          // update existing area
          updateTwoAreas (gradeRange, radioValue, newInsert, overlap, from, to)
        } else if (newInsert==-1&&overlap>-1) {
          // insert new area but update affected area
          insertArea(chart, am4core, gradeRange, radioValue, axis, series, from, to)
          //update area
          updateArea (gradeRange, overlap, from, to)
        } else if (newInsert==-1&&overlap==-1) {
          // insert new area and do nothing
          insertArea(chart, am4core, gradeRange, radioValue, axis, series, from, to)
        }
      }
      // update area ratio
      updateAreaRatio (gradeRange, scores)
    });

    let scrollbarX = new am4charts.XYChartScrollbar();
    scrollbarX.series.push(series);
    chart.scrollbarX = scrollbarX;

    chart.exporting.menu = new am4core.ExportMenu();
  }



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

/* Statistics Function */
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

/* Chart Function */
function selectColor (label) {
  var gradeColor = {
    "A+": "#0080ff",
    "A": "#00bfff",
    "A-": "#00ffff",
    "B+": "#00ff00",
    "B": "#80ff00",
    "B-": "#bfff00",
    "C+": "#ffff00",
    "C": "#ffff66",
    "C-": "#ffffb3",
    "D+": "#ff8000",
    "D": "#ffa64d",
    "D-": "#ffbf80",
    "F": "#ff0000"
  }
  var color = ""
  Object.keys(gradeColor).forEach(function(key) {
    if (key == label){
      color = gradeColor[key]
    }
  })
  return color;
}
function insertArea (chart, am4core, gradeRange, radioValue, axis, series, from, to) {
    var selectedColor = selectColor(radioValue)
    let colorRange = axis.createSeriesRange(series);
    colorRange.value = from;
    colorRange.endValue= to;
    colorRange.label.text=radioValue;
    colorRange.contents.stroke = am4core.color(selectedColor);
    colorRange.contents.fill = am4core.color(selectedColor);
    colorRange.contents.fillOpacity = 0.5;
    gradeRange.push(colorRange);
    chart.validateData();
}
function updateArea (gradeRange, overlap, from, to) {
  if(from>=gradeRange[overlap].value&&from<=gradeRange[overlap].endValue){
    gradeRange[overlap].endValue = from
  } else if (to>=gradeRange[overlap].value&&to<=gradeRange[overlap].endValue) {
    gradeRange[overlap].value = to
  }
}
function updateTwoAreas (gradeRange, radioValue, newInsert, overlap, from, to) {
  if (newInsert==overlap) {
    if((from>=gradeRange[overlap].value&&from<=gradeRange[overlap].endValue)){
      gradeRange[overlap].endValue = to;
      for (var i in gradeRange){
        if(gradeRange[i].label.text!=radioValue){
          if(gradeRange[overlap].endValue>=gradeRange[i].value&&gradeRange[overlap].endValue<=gradeRange[i].endValue){
            gradeRange[i].value=to;
          }
        }
      }
    } else if (to>=gradeRange[overlap].value&&to<=gradeRange[overlap].endValue) {
      gradeRange[overlap].value = from;
      for (var i in gradeRange){
        if(gradeRange[i].label.text!=radioValue){
          if(gradeRange[overlap].value>=gradeRange[i].value&&gradeRange[overlap].value<=gradeRange[i].endValue){
            gradeRange[i].endValue=from;
          }
        }
      }
    }
  } else {
    if (gradeRange[newInsert].value>=gradeRange[overlap].value&&gradeRange[newInsert].value>=gradeRange[overlap].endValue) { //left
      console.log("left")
      gradeRange[newInsert].value = from
      gradeRange[overlap].endValue = from
    } else if (gradeRange[newInsert].endValue<=gradeRange[overlap].value&&gradeRange[newInsert].endValue<=gradeRange[overlap].endValue) {//right
      console.log("right")
      gradeRange[newInsert].endValue = to
      gradeRange[overlap].value = to
    }
  }
}
function updateAreaRatio (gradeRange, scores) {
  for (var i in gradeRange) {
    var count=0;
    scores.forEach(function(item, index){
      if(item>=gradeRange[i].value&&item<=gradeRange[i].endValue){
        count++;
      }
    })
    var prob = count / scores.length
    $('#gradeTable #'+gradeRange[i].label.text).html(prob);
  }
}

/* Sorting */
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

function selectOnchange(elmt) {
  if ($(elmt).val() === 'Student ID' || $(elmt).val() === 'Ignore') {
    $(elmt).closest('td').next().find('input').val('');
    $(elmt).closest('td').next().find('input').prop('disabled', true);
  } else {
    $(elmt).closest('td').next().find('input').prop('disabled', false);
  }
}
