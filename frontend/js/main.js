$(document).ready(function () {
  am4core.useTheme(am4themes_animated);
  var chart = am4core.create('chartDiv', am4charts.XYChart);
  var histChart = am4core.create('histDiv', am4charts.XYChart);
  var weightingChart = am4core.create('weightingChartDiv', am4charts.PieChart);

  var scores = [];
  var gradeRange = [];
  var outputData = [];

  var mean = -1;
  var stdDev = -1;
  var max = -1;
  var min = -1;
  var median = -1;
  var upperQ = -1;
  var lowerQ = -1;

  // var unselectedScore = [];

  $('#binSize').text($('#binSlider').val());

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
                <select class="form-control columnTypeSelect" onchange="selectOnchange(this)">
                  <option value="ignore">Ignore</option>
                  <option value="sid">Student ID</option>
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz/Test</option>
                  <option value="midterm">Midterm</option>
                  <option value="proj">Project</option>
                  <option value="final">Final</option>
                  <option value="overall">Overall</option>
                </select>
              </td>
              <td>
                <input class="form-control" id="weighting-${i}" disabled="true" type="number" min="1" max="100">
              </td>
            </tr>`
            settingTableEl.push(settingTableRow);
          }
          $('#settingTable tbody').html(settingTableEl);
          suggestSetting();
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
              /*** calculate weighted score ***/
              var inputWeighting = getWeighting();
              var inputFields = getCsvFields();
              console.log(inputWeighting);
              console.log(inputFields);
              outputData = calculateWeightedScore(res, inputWeighting, inputFields);
              console.log(outputData);

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

              /*** create tab content ***/
              var tabItems = []
              $('#settingTable tbody tr').each(function (key, item) {
                if($(item).find('input').val() != ''){
                  tabItems.push($(item).find('th').html());
                }
              });
              console.log(tabItems);

              var tabNav = [];
              var tabContent = [];

              for (var i in tabItems) {
                let tabNavElement = `<li class="nav-item">
                  <a class="nav-link" id="${tabItems[i]}-tab" data-toggle="tab" href="#${tabItems[i]}" role="tab" aria-controls="${tabItems[i]}" aria-selected="true">${tabItems[i]}</a>
                </li>`;
                tabNav.push(tabNavElement);
                let tabContentElement = `<div class="tab-pane fade" id="${tabItems[i]}" role="tabpanel" aria-labelledby="${tabItems[i]}-tab">
                <table class="table" id="${tabItems[i]}-statsTable">
                  <thead class="thead-dark">
                    <tr>
                      <th scope="col">Statistics</th>
                      <th scope="col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Mean</th>
                      <td id="mean">50</td>
                    </tr>
                    <tr>
                      <th scope="row">Median</th>
                      <td id="median">50</td>
                    </tr>
                    <tr>
                      <th scope="row">Standard Deviation</th>
                      <td id="std">20</td>
                    </tr>
                    <tr>
                      <th scope="row">Max</th>
                      <td id="max">max</td>
                    </tr>
                    <tr>
                      <th scope="row">Min</th>
                      <td id="min">min</td>
                    </tr>
                    <tr>
                      <th scope="row">Median</th>
                      <td id="median">median</td>
                    </tr>
                  </tbody>
                </table>
                <div class="card mb-3">
                  <div class="card-header">
                    <i class="fas fa-table"></i>
                    Overall Table</div>
                  <div class="card-body">
                    <div class="table-responsive">
                      <table class="table table-hover" id="${tabItems[i]}-overallTable">
                        <thead class="thead-light">
                          <tr>
                            <th scope="col">SID</th>
                            <th scope="col">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                </div>`;
                tabContent.push(tabContentElement);
              }
              $('#myTab').prepend(tabNav);
              $('#myTabContent').prepend(tabContent);

              /*** create stat data (csv fields) ***/
              for (var i in tabItems) {
                console.log("tabItems: "+tabItems[i])
                let infoTable = []
                let scores = [];

                let mean = -1;
                let stdDev = -1;
                let max = -1;
                let min = -1;
                let median = -1;

                res.forEach(function (student, index) {
                  // console.log(student["sid"])
                  // console.log(student[tabItems[i]]);
                  let infoTableElement = `<tr>
                    <th scope="row">${student["sid"]}</th>
                    <td>${student[tabItems[i]]}</td>
                  </tr>`;
                  scores.push(parseFloat(student[tabItems[i]]));
                  infoTable.push(infoTableElement);
                });

                mean = calculateMeanScore(scores);
                $('#'+tabItems[i]+'-statsTable #mean').html(mean.toFixed(2));

                // stdDev = standardDeviation(scores);
                stdDev = standardDeviation(scores);
                $('#'+tabItems[i]+'-statsTable #std').html(stdDev.toFixed(2));

                // max = Math.max.apply(null, scores);
                max = Math.max.apply(null, scores);
                $('#'+tabItems[i]+'-statsTable #max').html(max);

                // min = Math.min.apply(null, scores);
                min = Math.min.apply(null, scores);
                $('#'+tabItems[i]+'-statsTable #min').html(min);

                median = calculateMedian(scores);
                $('#'+tabItems[i]+'-statsTable #median').html(median);

                $('#'+tabItems[i]+'-overallTable tbody').html(infoTable);
                $('#'+tabItems[i]+'-overallTable').DataTable();
              }

              $('#outputDiv').css('display', 'block')
              $('#chartOption').css('display', 'block')
              $('#chartDiv').css('display', 'block')
              // $('#chartDiv').css('display', 'block')
              // $('#weightingChartDiv').css('display', 'block')
              $('#gradeOption').css('display', 'block')
              $('#binOption').css('display', 'none')
              //$('#infoTableDiv').css('display', 'block')
              $('#fileSubmitDiv').css('display', 'none')
              // console.log(res);


              selectionSort(outputData);
              let infoTable = [];
              let data = [];

              for (let i in outputData) {
                scores.push(Number(outputData[i].score));
              }

              /*** create stat data (overall) ***/
              setOverallStat();

              // init overall-overallTable
              let overallDataSet = [];
              for (let i = 0; i < outputData.length; i++) {
                var new_data = {};
                let overallData = [];
                new_data.sid = outputData[i].sid;
                new_data.score = outputData[i].score;
                new_data.value = NormalDensityZx(scores[i], mean, stdDev);
                new_data.grade = '';
                data.push(new_data);

                overallData.push(outputData[i].sid);
                overallData.push(outputData[i].score.toFixed(2));
                overallData.push('');
                overallDataSet.push(overallData);
              }
              $('#overall-overallTable').DataTable({
                  data: overallDataSet,
                  columns: [
                      { title: "SID" },
                      { title: "Score" },
                      { title: "Grade" }
                  ]
              });
              console.log(data);
              /*** overall table data ***/
              chart.data = data;

              let weightData = [];
              for (let i = 0; i < inputWeighting.length; i++) {
                var new_data = {};
                if (inputWeighting[i]>0){
                  new_data.component = inputFields[i];
                  new_data.weighting = inputWeighting[i];
                  weightData.push(new_data);
                }
              }
              /*** weighting table data ***/
              weightingChart.data = weightData
              console.log(weightData);

              var changeSettingEl = []
              for (let i in inputFields) {
                console.log(inputFields[i])
                if (inputWeighting[i] === 0) {
                  let changeSettingTableRow = `<tr>
                    <th scope="row">${inputFields[i]}</th>
                    <td>
                      <input class="form-control" id="changeWeighting-${i}" value="${inputWeighting[i] * 100}" disabled="true" type="number" min="1" max="100">
                    </td>
                  </tr>`
                  changeSettingEl.push(changeSettingTableRow)
                } else {
                  let changeSettingTableRow = `<tr>
                    <th scope="row">${inputFields[i]}</th>
                    <td>
                      <input class="form-control" id="changeWeighting-${i}" value="${inputWeighting[i] * 100}" type="number" min="1" max="100">
                    </td>
                  </tr>`
                  changeSettingEl.push(changeSettingTableRow)
                }

              }
              $('#changeSettingTable tbody').html(changeSettingEl);


              let histMax = Math.ceil(max/5)*5;
              let histMin = Math.floor(min/5)*5;
              console.log("max: "+histMax+" min: "+histMin);
              let binNum = 10;
              let binSize = (histMax - histMin)/binNum;
              console.log("bin size: "+binSize)

              let histData = [];
              for (let i = 0; i < binNum; i++){
                var new_data = {};
                new_data.boundary = (histMin+(i*binSize)).toFixed(2).toString()
                new_data.frequency = 0;
                histData.push(new_data);
              }

              for (let i = 0; i < outputData.length; i++) {
                for (let j = 0; j < binNum; j++){
                  let minBoundary = parseFloat(histData[j].boundary)
                  if (j!=binNum-1) {
                    let maxBoundary = parseFloat(histData[j+1].boundary)
                    if (outputData[i].score>=minBoundary&&outputData[i].score<maxBoundary) {
                      histData[j].frequency = histData[j].frequency+1;
                      break;
                    }
                  } else {
                    if (outputData[i].score>=minBoundary) {
                      histData[j].frequency = histData[j].frequency+1;
                      break;
                    }
                  }
                }
              }
              //histData.pop();
              /*** histogram data ***/
              histChart.data = histData

              initChart();
              initWeightingChart();
              initHistChart();
            }
          });
  })

  $('#binSlider').change(function () {
    var value = $('#binSlider').val();
    $('#binSize').text(value);
  });

  $('#showOverallChartBtn').click(function () {
    $('#chartDiv').css('display', 'block')
    $('#gradeOption').css('display', 'block')
    $('#histDiv').css('display', 'none')
    $('#binOption').css('display', 'none')
    $('#weightingChartDiv').css('display', 'none')
    $('#changeSettingDiv').css('display', 'none')
  })

  $('#showOverallHistBtn').click(function () {
    $('#histDiv').css('display', 'block')
    $('#binOption').css('display', 'block')
    $('#chartDiv').css('display', 'none')
    $('#gradeOption').css('display', 'none')
    $('#weightingChartDiv').css('display', 'none')
    $('#changeSettingDiv').css('display', 'none')
  })

  $('#showWeightingChartBtn').click(function () {
    $('#weightingChartDiv').css('display', 'block')
    $('#changeSettingDiv').css('display', 'block')
    $('#chartDiv').css('display', 'none')
    $('#gradeOption').css('display', 'none')
    $('#histDiv').css('display', 'none')
    $('#binOption').css('display', 'none')
  })

  $('#changeBinSizeBtn').click(function () {
    var value = $('#binSlider').val();
    let histMax = Math.ceil(max/5)*5;
    let histMin = Math.floor(min/5)*5;

    let binNum = value;
    let binSize = (histMax - histMin)/binNum;

    let histData = [];
    for (let i = 0; i < binNum; i++){
      var new_data = {};
      new_data.boundary = (histMin+(i*binSize)).toFixed(2).toString()
      new_data.frequency = 0;
      histData.push(new_data);
    }

    for (let i = 0; i < outputData.length; i++) {
      for (let j = 0; j < binNum; j++){
        let minBoundary = parseFloat(histData[j].boundary)
        if (j!=binNum-1) {
          let maxBoundary = parseFloat(histData[j+1].boundary)
          if (outputData[i].score>=minBoundary&&outputData[i].score<maxBoundary) {
            histData[j].frequency = histData[j].frequency+1;
            break;
          }
        } else {
          if (outputData[i].score>=minBoundary) {
            histData[j].frequency = histData[j].frequency+1;
            break;
          }
        }
      }
    }
    histChart.data = histData
    console.log(histChart.data);
    histChart.validateData();
  })

  $('#gradeClearBtn').click(function () {
    //xAxis.axisRanges.clear();
    for (var i in gradeRange){
      chart.xAxes.getIndex(0).axisRanges.removeValue(gradeRange[i]);
    }
    gradeRange = [];
  })

  $('#gradeApplyBtn').click(function () {
    //console.log(gradeRange);
    setGrade (chart, gradeRange);
  })

  $('#overall-overallTable tbody').click(function (e){
    moveCursor (chart, e.target.innerHTML)
  })

  $('#changeWeightingBtn').click(function () {
    // let newScores = [];

    $.ajax({
      url: 'http://localhost:3000/getfile/' + $('#filename').val(),
      type: 'GET',
      contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
      processData: false // NEEDED, DON'T OMIT THIS
    }).done(function (res) {
      console.log(res);

      let weightData = [];
      var inputWeighting = getWeighting('new');
      var inputFields = getCsvFields('new');
      var outputData = calculateWeightedScore(res, inputWeighting, inputFields);
      console.log(outputData);

      selectionSort(outputData);
      let data = [];

      scores.length = 0;
      for (let i in outputData) {
        // newScores.push(Number(outputData[i].score));
        scores.push(Number(outputData[i].score));
      }

      /*** update stat data (overall) ***/
      setOverallStat();

      /*** update overall-overallTable ***/
      let overallDataSet = [];
      for (let i = 0; i < outputData.length; i++) {
        var new_data = {};
        let overallData = [];
        new_data.sid = outputData[i].sid;
        new_data.score = outputData[i].score;
        new_data.value = NormalDensityZx(scores[i], mean, stdDev);
        new_data.grade = '';
        data.push(new_data);

        overallData.push(outputData[i].sid);
        overallData.push(outputData[i].score.toFixed(2));
        overallData.push('');
        overallDataSet.push(overallData);
      }
      // destroy the original datatable before reinitializing
      let overallDataTable = $('#overall-overallTable').DataTable();
      overallDataTable.destroy();

      overallDataTable = $('#overall-overallTable').DataTable({
          data: overallDataSet,
          columns: [
              { title: "SID" },
              { title: "Score" },
              { title: "Grade" }
          ]
      });

      /*** update (bell curve) chart  ***/
      chart.data = data;
      chart.validateData();

      /*** update weightingChart ***/
      for (let i = 0; i < inputWeighting.length; i++) {
        var newWeighting = {};
        if (inputWeighting[i] > 0) {
          newWeighting.component = inputFields[i];
          newWeighting.weighting = inputWeighting[i];
          weightData.push(newWeighting);
        }
      }
      console.log(weightData);
      weightingChart.data = weightData;
      weightingChart.validateData();

      /*** update histChart ***/
      let histMax = Math.ceil(max/5)*5;
      let histMin = Math.floor(min/5)*5;
      console.log("max: "+histMax+" min: "+histMin);
      let binNum = 10;
      let binSize = (histMax - histMin)/binNum;
      console.log("bin size: "+binSize)

      let histData = [];
      for (let i = 0; i < binNum; i++){
        var new_data = {};
        new_data.boundary = (histMin+(i*binSize)).toFixed(2).toString()
        new_data.frequency = 0;
        histData.push(new_data);
      }

      for (let i = 0; i < outputData.length; i++) {
        for (let j = 0; j < binNum; j++){
          let minBoundary = parseFloat(histData[j].boundary)
          if (j!=binNum-1) {
            let maxBoundary = parseFloat(histData[j+1].boundary)
            if (outputData[i].score>=minBoundary&&outputData[i].score<maxBoundary) {
              histData[j].frequency = histData[j].frequency+1;
              break;
            }
          } else {
            if (outputData[i].score>=minBoundary) {
              histData[j].frequency = histData[j].frequency+1;
              break;
            }
          }
        }
      }
      histChart.data = histData
      histChart.validateData();

    });
  })

  function initChart() {
    var xAxis = chart.xAxes.push(new am4charts.ValueAxis());
    xAxis.dataFields.value = 'score';
    // xAxis.strictMinMax = true;
    // xAxis.min = -5;
    // xAxis.max = 105;
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
    //yAxis.max = 0.02;
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
          updateTwoAreas (chart, gradeRange, radioValue, newInsert, overlap, from, to)
        } else if (newInsert==-1&&overlap>-1) {
          // insert new area but update affected area
          insertArea(chart, am4core, gradeRange, radioValue, axis, series, from, to)
          //update area
          updateArea (chart, gradeRange, overlap, from, to)
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

    let scrollbarY = new am4charts.XYChartScrollbar();
    scrollbarY.series.push(series);
    chart.scrollbarY = scrollbarY;

    chart.exporting.menu = new am4core.ExportMenu();
  }

  function initWeightingChart() {
    var pieSeries = weightingChart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = "weighting";
    pieSeries.dataFields.category = "component";
  }

  function initHistChart() {
    // Create axes
    var categoryAxis = histChart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = "boundary";
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.minGridDistance = 30;

    categoryAxis.renderer.labels.template.adapter.add("dy", function(dy, target) {
      if (target.dataItem && target.dataItem.index & 2 == 2) {
        return dy + 20;
      }
      return dy;
    });

    var valueAxis = histChart.yAxes.push(new am4charts.ValueAxis());

    // Create series
    var series = histChart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = "frequency";
    series.dataFields.categoryX = "boundary";
    series.name = "Frequency";
    series.columns.template.tooltipText = "{categoryX}: [bold]{valueY}[/]";
    series.columns.template.fillOpacity = .8;

    var columnTemplate = series.columns.template;
    columnTemplate.strokeWidth = 2;
    columnTemplate.strokeOpacity = 1;
  }

  function setOverallStat () {
    $('#overall-statsTable #count').html(scores.length);

    mean = calculateMeanScore(scores);
    $('#overall-statsTable #mean').html(mean.toFixed(2));
    console.log('mean: ' + mean);

    median = calculateMedian(scores);
    $('#overall-statsTable #median').html(median.toFixed(2));

    stdDev = standardDeviation(scores);
    $('#overall-statsTable #std').html(stdDev.toFixed(2));
    console.log('stdDev: ' + stdDev);

    max = Math.max.apply(null, scores);
    $('#overall-statsTable #max').html(max.toFixed(2));
    console.log('max: ' + max);

    min = Math.min.apply(null, scores);
    $('#overall-statsTable #min').html(min.toFixed(2));
    console.log('min: ' + min);

    upperQ = Quartile_75(scores);
    $('#overall-statsTable #upperQ').html(upperQ.toFixed(2));
    console.log("Upper Quartile: "+upperQ);

    lowerQ = Quartile_25(scores);
    $('#overall-statsTable #lowerQ').html(lowerQ.toFixed(2));
    console.log("Lower Quartile: "+lowerQ);
  }

});


function alertRefresh () {
  return 0;
}

/*** Scroll to the top of the page ***/
// window.onscroll = function () {
//   scrollFunction()
// };
// function scrollFunction () {
//   if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
//     $('#backToTopBtn').css('display', 'block')
//   } else {
//     $('#backToTopBtn').css('display', 'none')
//   }
// }
// function topFunction () {
//   document.body.scrollTop = 0;
//   document.documentElement.scrollTop = 0;
// }

/*** Statistics Function ***/
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
function calculateMedian(scores) {
    // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
    var median = 0, numsLen = scores.length;
    scores.sort();

    if (
        numsLen % 2 === 0 // is even
    ) {
        // average of two middle numbers
        median = (scores[numsLen / 2 - 1] + scores[numsLen / 2]) / 2;
    } else { // is odd
        // middle number only
        median = scores[(numsLen - 1) / 2];
    }

    return median;
}
function calculateMode(numbers) {
    // as result can be bimodal or multi-modal,
    // the returned result is provided as an array
    // mode of [3, 5, 4, 4, 1, 1, 2, 3] = [1, 3, 4]
    var modes = [], count = [], i, number, maxIndex = 0;

    for (i = 0; i < numbers.length; i += 1) {
        number = numbers[i];
        count[number] = (count[number] || 0) + 1;
        if (count[number] > maxIndex) {
            maxIndex = count[number];
        }
    }

    for (i in count)
        if (count.hasOwnProperty(i)) {
            if (count[i] === maxIndex) {
                modes.push(Number(i));
            }
        }

    return modes;
}
function Quartile_25(data) {
  return Quartile(data, 0.25);
}
function Quartile_75(data) {
  return Quartile(data, 0.75);
}
function Quartile(scores, q) {
  var data = scores.sort();
  var pos = ((data.length) - 1) * q;
  var base = Math.floor(pos);
  var rest = pos - base;
  if( (data[base+1]!==undefined) ) {
    return data[base] + rest * (data[base+1] - data[base]);
  } else {
    return data[base];
  }
}
function NormalDensityZx (x, Mean, StdDev) {
  var a = x - Mean;
  return Math.exp( -( a * a ) / ( 2 * StdDev * StdDev ) ) / ( Math.sqrt( 2 * Math.PI ) * StdDev );
}
function calculateMedian (scores) {
	scores.sort(function (a, b) {
  	return a - b;
  });

  var half = Math.floor(scores.length / 2);

  if (scores.length % 2)
  	return scores[half];
  else
  	return (scores[half - 1] + scores[half]) / 2.0;
}
function calculateWeightedScore (inputdata, inputWeighting, inputFields) {
  console.log(inputdata);
  console.log(inputWeighting);
  console.log(inputFields);
  var output = []
  inputdata.forEach(function (student, index) {
    let tmpScore = 0;
    let studentObj = {};
    for (let i = 0; i < inputFields.length; i++) {
      if (inputWeighting[i] === 0) {
        studentObj[inputFields[i]] = student[inputFields[i]];
      } else {
        tmpScore += inputWeighting[i] * student[inputFields[i]];
      }
    }
    studentObj['score'] = tmpScore;
    output.push(studentObj);
  });
  return output;
}

/*** Chart Function ***/
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
  console.log("insert area")
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
function updateArea (chart, gradeRange, overlap, from, to) {
  if(from>=gradeRange[overlap].value&&from<=gradeRange[overlap].endValue){
    gradeRange[overlap].endValue = from
  } else if (to>=gradeRange[overlap].value&&to<=gradeRange[overlap].endValue) {
    gradeRange[overlap].value = to
  }
  chart.validateData();
}
function updateTwoAreas (chart, gradeRange, radioValue, newInsert, overlap, from, to) {
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
  chart.validateData();
}
function updateAreaRatio (gradeRange, scores) {
  for (var i in gradeRange) {
    var count=0;
    scores.forEach(function(item, index){
      if(item>=gradeRange[i].value&&item<=gradeRange[i].endValue){
        count++;
      }
    })
    var num = count
    $('#gradeTable #'+gradeRange[i].label.text).html(num);
  }
}

function moveCursor (chart, sid) {
  for (var i in chart.data){
    if (chart.data[i].sid==sid){
      console.log("found "+sid)
      topFunction();
      let point = {
        x: 0,
        y: 0
      }
      let tmpX = chart.xAxes.getIndex(0).valueToPoint(parseFloat(chart.data[i].score));
      let tmpY = chart.yAxes.getIndex(0).valueToPoint(parseFloat(chart.data[i].value));
      point.x = tmpX.x;
      point.y = tmpY.y;
      chart.cursor.triggerMove(point, "none");
      break;
    }
  }
}

function setGrade (chart, gradeRange) {
  // reset chart data first
  for (let i = 0; i < chart.data.length; i++) {
      chart.data[i].grade = '';
  }
  // update chart data
  for (var index in gradeRange){
    for (let i = 0; i < chart.data.length; i++) {
      if(chart.data[i].score>=gradeRange[index].value&&chart.data[i].score<=gradeRange[index].endValue){
        chart.data[i].grade = gradeRange[index].label.text;
      }
    }
  }
  // update table
  let infoTable = [];
  for (let i = 0; i < chart.data.length; i++) {
    $('#overall-overallTable').DataTable().rows().every( function () {
        var row = this.data();

        if (row[0]==chart.data[i].sid){
          row[2] = chart.data[i].grade;
        }
        this.invalidate();
    } );
  }
  $('#overall-overallTable').DataTable().draw();
}

/*** Sorting ***/
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

/*** handle select form option onchange ***/
function selectOnchange(elmt) {
  console.log(elmt);
  if ($(elmt).val() === 'sid' || $(elmt).val() === 'ignore') {
    $(elmt).closest('td').next().find('input').val('');
    $(elmt).closest('td').next().find('input').prop('disabled', true);
  } else if ($(elmt).val() === 'overall') {
    $(elmt).closest('td').next().find('input').val(100);
    $(elmt).closest('td').next().find('input').prop('disabled', false);
  } else {
    $(elmt).closest('td').next().find('input').prop('disabled', false);
  }
}

function suggestSetting() {
  var overall = 100;
  var weighting = [];
  // $('#settingTable tbody tr').each(function (key, item) {
  //   if ($(item).find('th').html().includes('sid') || $(item).find('th').html().includes('student')) {
  //
  //   } else if ($(item).find('th').html().includes('asg') || $(item).find('th').html().includes('assignment') || $(item).find('th').html().includes('hw') || $(item).find('th').html().includes('homework')) {
  //     weighting.push('asg');
  //   } else if ($(item).find('th').html().includes('midterm')) {
  //     weighting.push('midterm');
  //   } else if ($(item).find('th').html().includes('quiz') || $(item).find('th').html().includes('test')) {
  //     weighting.push('quiz');
  //   } else if ($(item).find('th').html().includes('proj')) {
  //     weighting.push('proj');
  //   } else if ($(item).find('th').html().includes('final') || $(item).find('th').html().includes('exam')) {
  //     weighting.push('final');
  //   } else if ($(item).find('th').html().includes('score')) {
  //     weighting.push('score');
  //   }
  // });

  $('#settingTable tbody tr').each(function (key, item) {
    if ($(item).find('th').html().includes('sid') || $(item).find('th').html().includes('student')) {
      $(item).find('select').val('sid');
      $(item).find('input').val('');
      $(item).find('input').prop('disabled', true);
    } else if ($(item).find('th').html().includes('asg') || $(item).find('th').html().includes('assignment') || $(item).find('th').html().includes('hw') || $(item).find('th').html().includes('homework')) {
      $(item).find('select').val('assignment');
      $(item).find('input').prop('disabled', false);
    } else if ($(item).find('th').html().includes('midterm')) {
      $(item).find('select').val('midterm');
      $(item).find('input').prop('disabled', false);
    } else if ($(item).find('th').html().includes('quiz') || $(item).find('th').html().includes('test')) {
      $(item).find('select').val('quiz');
      $(item).find('input').prop('disabled', false);
    } else if ($(item).find('th').html().includes('proj')) {
      $(item).find('select').val('proj');
      $(item).find('input').prop('disabled', false);
    } else if ($(item).find('th').html().includes('final') || $(item).find('th').html().includes('exam')) {
      $(item).find('select').val('final');
      $(item).find('input').prop('disabled', false);
    } else if ($(item).find('th').html().includes('score')) {
      $(item).find('select').val('overall');
      $(item).find('input').val(100);
      $(item).find('input').prop('disabled', false);
    } else {
      $(item).find('select').val('ignore');
    }
  });
}

/*** get original data ***/
function getOrgData () {
  var orgData = {};

}

/*** get weighting from setting table ***/
function getWeighting (option) {
  var weighting = [];

  /*** option = 'new' --> get from new setting table ***/
  /*** option = null  --> get from original setting page table ***/
  if (option) {
    $('#changeSettingTable tbody tr').each(function (key, item) {
      weighting.push(Number($(item).find('input').val()) / 100.0);
    });
  } else {
    $('#settingTable tbody tr').each(function (key, item) {
      weighting.push(Number($(item).find('input').val()) / 100.0);
    });
  }

  return weighting;
}

function getCsvFields (option) {
  var fields = [];

  /*** option = 'new' --> get from new setting table ***/
  /*** option = null  --> get from original data ***/
  if (option) {
    $('#changeSettingTable tbody tr').each(function (key, item) {
      fields.push($(item).find('th').html());
    });
  } else {
    $('#settingTable tbody tr').each(function (key, item) {
      fields.push($(item).find('th').html());
    });
  }

  return fields;
}
