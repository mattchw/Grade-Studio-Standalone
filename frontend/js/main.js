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

      $.ajax({
        url: 'http://localhost:3000/getfile/' + $('#filename').val(),
        type: 'GET',
        contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
        processData: false // NEEDED, DON'T OMIT THIS
      }).done(function (res) {
          // basic checking of csv
          var isRepeatSid = false;
          var isNegativeScore = false;

          // check repeat student
          for (let i = 0; i < res.length; i++) {
            for (let j = i + 1; j < res.length; j++) {
              if (typeof res[i].sid !== 'undefined') {
                if (res[i].sid === res[j].sid) {
                  isRepeatSid = true;
                }
              } else if (typeof res[i].student !== 'undefined') {
                if (res[i].student === res[j].student) {
                  isRepeatSid = true;
                }
              }
            }
          }

          console.log(isRepeatSid);

          if (isRepeatSid) {
            alert('There are repeated student ID! Please check your CSV file');
          } else {
            console.log('no repeat');

            $('#topHeader').css('display', 'none')
            $('#start').css('display', 'none')
            $('#fileSubmitDiv').css('display', 'block')

            var settingTableEl = []
            for (let i in Object.keys(res[0])) {
              let settingTableRow = `<tr>
                <th scope="row">${Object.keys(res[0])[i]}</th>
                <td class="">
                  <select class="form-control columnTypeSelect" onchange="selectOnchange(this)">
                    <option value="ignore">Ignore</option>
                    <option value="sid">Student ID</option>
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
          }


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
              alert('Weighting cannot be negative! Please Check Again.');
            } else if (tableWeighting !== 100) {
              var isProceed = confirm('Toal weighting not equal to 100%. Are you sure?');
            }

            if (tableWeighting == 100 || isProceed) {
              /*** calculate weighted score ***/
              var inputWeighting = getWeighting();
              var inputFields = getCsvFields();
              console.log(inputWeighting);
              console.log(inputFields);
              outputData = calculateWeightedScore(res, inputWeighting, inputFields);
              console.log(outputData);

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
                res.forEach(function (student, index) {
                  if(new_data.sid==student["sid"]){
                      for (let j = 0; j<tabItems.length;j++){
                        new_data[tabItems[j]]=student[tabItems[j]]
                      }
                  }
                });
                new_data.score = outputData[i].score.toFixed(2);
                new_data.pdf = NormalDensityZx(scores[i], mean, stdDev);
                new_data.grade = '';
                new_data.remark = '';
                data.push(new_data);

                overallData.push(outputData[i].sid);
                overallData.push(outputData[i].sid);
                overallData.push(outputData[i].score.toFixed(2));
                overallData.push('');
                overallDataSet.push(overallData);
              }
              $('#overall-overallTable').DataTable({
                  data: data,
                  columns: [
                      {
                        "className":      'up-control',
                        "width":          "20px",
                        "orderable":      false,
                        "data":           null,
                        "defaultContent": ''
                      },
                      { title: "SID", data: "sid" },
                      { title: "Score", data: "score" },
                      { title: "Grade", data: "grade" },
                      {
                        "className":      'special-control',
                        "width":          "20px",
                        "orderable":      false,
                        "data":           null,
                        "defaultContent": ''
                      },{
                        "className":      'details-control',
                        "width":          "20px",
                        "orderable":      false,
                        "data":           null,
                        "defaultContent": ''
                      },
                  ],
                  "order": [[1, 'asc']],
                  "pagingType": "full_numbers"
              });
              console.log(data);
              /*** overall table data ***/
              chart.data = data;

              $('#overall-overallTable tbody').on('click', 'td.up-control', function () {
                var data = $('#overall-overallTable').DataTable().cell( this ).data();
                console.log(data);
                moveCursor (chart, data.sid);
              } );

              $('#overall-overallTable tbody').on('click', 'td.special-control', function () {
                $("#gradeModal").modal("show");
                var target = $('#overall-overallTable').DataTable().cell( this ).data();
                console.log(target);
                $("#remarkText").val("");
                    // e.stopPropagation();
                    $('#specialHandleApplyBtn').one('click', function(e) {
                      var text = $("#remarkText").val();
                      console.log(text);
                        //alert('clicked');
                        var specialHandleValue = $("input[name='specialHandle']:checked").val();
                          for (let i = 0; i < chart.data.length; i++) {
                            if(chart.data[i].sid==target.sid){
                              chart.data[i].grade = specialHandleValue;
                              chart.data[i].remark = text;
                              console.log("chart data of "+target.sid+" is set to "+specialHandleValue);
                            }
                          }
                          //console.log(chart.data);
                          //update table
                          for (let i = 0; i < chart.data.length; i++) {
                            $('#overall-overallTable').DataTable().rows().every( function () {
                                var row = this.data();

                                if (row[0]==chart.data[i].sid){
                                  row[2] = chart.data[i].grade+"*";
                                }
                                this.invalidate();
                            } );
                          }
                          $('#overall-overallTable').DataTable().draw();
                          alert('Special handle done.')
                    });
              } );

              // Add event listener for opening and closing details
              $('#overall-overallTable tbody').on('click', 'td.details-control', function () {
                  var tr = $(this).closest('tr');
                  var row = $('#overall-overallTable').DataTable().row( tr );

                  if ( row.child.isShown() ) {
                      // This row is already open - close it
                      row.child.hide();
                      tr.removeClass('shown');
                  }
                  else {
                      // Open this row
                      row.child( format(row.data()) ).show();
                      tr.addClass('shown');
                  }
              } );


              /*** weighting table data ***/
              weightingChart.data = calculateWeightChartData(inputWeighting, inputFields);

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

              // /*** histogram data ***/
              setHistChartData (10);

              initChart();
              initWeightingChart();
              initHistChart();
            }


          });
  })

  $('#binSlider').change(function () {
    var value = $('#binSlider').val();
    $('#binSize').text(value);
    setHistChartData (value);
    histChart.validateData();
  });

  $('#suggestionCheck').change(function(){
    if($(this).is(':checked')) {
        // Checkbox is checked..
        $('#suggestTable').css('display', 'block')
    } else {
        // Checkbox is not checked..
        $('#suggestTable').css('display', 'none')
    }
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

  $('#gradeClearBtn').click(function () {
    //xAxis.axisRanges.clear();
    for (var i in gradeRange){
      chart.xAxes.getIndex(0).axisRanges.removeValue(gradeRange[i]);
    }
    gradeRange = [];
  })

  $('#gradeApplyBtn').click(function () {
    //console.log(gradeRange);
    alert('Grades are applied.')
    setGrade (chart, gradeRange);
  })

  $('#changeWeightingBtn').click(function () {
    var newTableWeighting = 0;
    $('table#changeSettingTable tr input').each(function () {
      if (isNaN(parseInt($(this).val())) === false) {
        let percentage = parseInt($(this).val());
        newTableWeighting += percentage;
      }
    });
    console.log(newTableWeighting);
    if (newTableWeighting > 100) {
      alert('Total weighting over 100%. Please check again.');
    } else if (newTableWeighting <= 0) {
      alert('Wrong Weighting! Please Check Again.');
    } else if (newTableWeighting !== 100) {
      alert('Toal weighting not equal to 100%. Please check again.');
    } else {
      $.ajax({
        url: 'http://localhost:3000/getfile/' + $('#filename').val(),
        type: 'GET',
        contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
        processData: false // NEEDED, DON'T OMIT THIS
      }).done(function (res) {
        console.log(res);

        var inputWeighting = getWeighting('new');
        var inputFields = getCsvFields('new');
        outputData = calculateWeightedScore(res, inputWeighting, inputFields);
        console.log(outputData);

        selectionSort(outputData);
        let data = [];

        scores.length = 0;  // empty original scores array
        for (let i in outputData) {
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
          res.forEach(function (student, index) {
            if(new_data.sid==student["sid"]){
                for (let j = 0; j<inputFields.length;j++){
                  new_data[inputFields[j]]=student[inputFields[j]]
                }
            }
          });
          new_data.score = outputData[i].score.toFixed(2);
          new_data.pdf = NormalDensityZx(scores[i], mean, stdDev);
          new_data.grade = '';
          new_data.remark = '';
          data.push(new_data);

          overallData.push(outputData[i].sid);
          overallData.push(outputData[i].score.toFixed(2));
          overallData.push('');
          overallDataSet.push(overallData);
        }
        console.log(data);

        let overallDataTable = $('#overall-overallTable').DataTable();
        overallDataTable.destroy(); // destroy the original datatable before reinitializing

        overallDataTable = $('#overall-overallTable').DataTable({
          data: data,
          columns: [
              {
                "className":      'up-control',
                "width":          "20px",
                "orderable":      false,
                "data":           null,
                "defaultContent": ''
              },
              { title: "SID", data: "sid" },
              { title: "Score", data: "score" },
              { title: "Grade", data: "grade" },
              {
                "className":      'special-control',
                "width":          "20px",
                "orderable":      false,
                "data":           null,
                "defaultContent": ''
              },{
                "className":      'details-control',
                "width":          "20px",
                "orderable":      false,
                "data":           null,
                "defaultContent": ''
              },
          ],
          "order": [[1, 'asc']],
          "pagingType": "full_numbers"
        });

        /*** update (bell curve) chart  ***/
        chart.data = data;
        chart.validateData();

        /*** update weightingChart ***/
        weightingChart.data = calculateWeightChartData(inputWeighting, inputFields);
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
        /*** histogram data ***/
        histChart.data = histData
        histChart.validateData();

      });

      alert('New weighting applied.')
    }
  })

  function initChart() {
    var xAxis = chart.xAxes.push(new am4charts.ValueAxis());
    xAxis.dataFields.value = 'score';
    // xAxis.strictMinMax = true;
    // xAxis.min = -5;
    // xAxis.max = 105;
    xAxis.title.text = 'Score';
    xAxis.title.fontWeight = 600;

    // var meanRange = xAxis.axisRanges.create();
    // meanRange.value = mean;
    // meanRange.grid.stroke = am4core.color("#396478");
    // meanRange.grid.strokeWidth = 2;
    // meanRange.grid.strokeOpacity = 1;
    // meanRange.label.text = "Mean";
    // meanRange.label.fill = meanRange.grid.stroke;

    // var leftSdRange = xAxis.axisRanges.create();
    // leftSdRange.value = mean-stdDev;
    // leftSdRange.grid.stroke = am4core.color("#396478");
    // leftSdRange.grid.strokeWidth = 2;
    // leftSdRange.grid.strokeOpacity = 1;
    // leftSdRange.label.text = "μ-σ";
    // leftSdRange.label.fill = leftSdRange.grid.stroke;
    //
    // var rightSdRange = xAxis.axisRanges.create();
    // rightSdRange.value = mean+stdDev;
    // rightSdRange.grid.stroke = am4core.color("#396478");
    // rightSdRange.grid.strokeWidth = 2;
    // rightSdRange.grid.strokeOpacity = 1;
    // rightSdRange.label.text = "μ+σ";
    // rightSdRange.label.fill = rightSdRange.grid.stroke;

    var yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.dataFields.value = 'pdf';
    yAxis.min = 0;
    //yAxis.max = 0.02;
    yAxis.title.text = 'Normal Density';
    yAxis.title.fontWeight = 600;

    let series = chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueX = 'score';
    series.dataFields.valueY = 'pdf';
    series.tooltipText = '{valueY.value}';

    var bullet = series.bullets.push(new am4charts.Bullet());
    var square = bullet.createChild(am4core.Rectangle);
    square.width = 5;
    square.height = 5;

    if ($('#suggestionCheck').is(":checked")) {
      console.log("it is checked")
      suggestArea (chart, am4core, gradeRange, series, outputData, max, min);
    }

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
      var scoreArr = [];
      for (var i = scores.length-1;i>=0;i--){
        scoreArr.push(scores[i]);
      }
      for (var i in gradeRange) {
        var value = findPercentile(scoreArr,gradeRange[i].value);
        console.log("percentile: "+findPercentile(scoreArr,gradeRange[i].value));
        let cumPercentile = value * 100;
        console.log(cumPercentile.toFixed(2));
        // $('#gradeTable #percentile-'+gradeRange[i].label.text).html(value*100 + "%");
        $('#gradeTable #percentile-'+gradeRange[i].label.text).html(cumPercentile.toFixed(2) + "%");
        if(gradeRange[i].value<scoreArr[scoreArr.length-1]){
          $('#gradeTable #cutoff-'+gradeRange[i].label.text).html((scoreArr[scoreArr.length-1]).toFixed(2));
        } else {
          $('#gradeTable #cutoff-'+gradeRange[i].label.text).html((gradeRange[i].value).toFixed(2));
        }
      }
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

  function setHistChartData (inputBinNum) {
    let histMax = Math.ceil(max/5)*5;
    let histMin = Math.floor(min/5)*5;
    console.log("max: "+histMax+" min: "+histMin);
    let binNum = inputBinNum;
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
  }

});
// end of document ready

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

/*** DataTable Functions ***/
function format ( d ) {
    // `d` is the original data object for the row
    return '<table class="table table-hover">'+
        '<tr>'+
            '<td>Remark</td>'+
            '<td>'+d.remark+'</td>'+
        '</tr>'+
    '</table>';
}

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

/**
   * @param {number} value - the number to convert to a z-score
   * @return {number} the z-score of the value
   */
function zScore(value, mean, sd) {
  return (value - mean) / sd;
}
function cdf(value, mean, sd) {
    let zScore = this.zScore(value, mean, sd);
    zScore = round(zScore, 2);

    if (zScore === 0) {
      return 0.5;
    } else if (zScore <= -3.5) {
      return 0;
    } else if (zScore >= 3.5) {
      return 1;
    }

    //const zTable = NormalDistribution.zTable;
    const absZScore = Math.abs(zScore);
    const zRow = Math.floor(absZScore * 10) / 10;
    const zCol = round((Math.round(absZScore * 100) % 10) / 100, 2);
    const zColIndex = zTable.z.indexOf(zCol);
    const absPercentile = zTable[zRow.toString()][zColIndex];

    return zScore < 0 ? 1 - absPercentile : absPercentile;
}
  /**
   * Return the probability of a value in the distribution being
   *   between two values
   * @param {number} value1 - the first boundary
   * @param {number} value2 - the second boundary
   * @return {number} the probability
   */
function probabilityBetween(value1, value2, mean, sd) {
    return Math.abs(this.cdf(value1, mean, sd) - this.cdf(value2, mean, sd));
}
const zTable = {
    "z"  :  [0     , 0.01  , 0.02  , 0.03  , 0.04,   0.05  , 0.06  , 0.07  , 0.08  , 0.09  ],
    "0"  :  [0.5000, 0.5040, 0.5080, 0.5120, 0.5160, 0.5199, 0.5239, 0.5279, 0.5319, 0.5359],
    "0.1":  [0.5398, 0.5438, 0.5478, 0.5517, 0.5557, 0.5596, 0.5636, 0.5675, 0.5714, 0.5753],
    "0.2":  [0.5793, 0.5832, 0.5871, 0.5910, 0.5948, 0.5987, 0.6026, 0.6064, 0.6103, 0.6141],
    "0.3":  [0.6179, 0.6217, 0.6255, 0.6293, 0.6331, 0.6368, 0.6406, 0.6443, 0.6480, 0.6517],
    "0.4":  [0.6554, 0.6591, 0.6628, 0.6664, 0.6700, 0.6736, 0.6772, 0.6808, 0.6844, 0.6879],
    "0.5":  [0.6915, 0.6950, 0.6985, 0.7019, 0.7054, 0.7088, 0.7123, 0.7157, 0.7190, 0.7224],
    "0.6":  [0.7257, 0.7291, 0.7324, 0.7357, 0.7389, 0.7422, 0.7454, 0.7486, 0.7517, 0.7549],
    "0.7":  [0.7580, 0.7611, 0.7642, 0.7673, 0.7704, 0.7734, 0.7764, 0.7794, 0.7823, 0.7852],
    "0.8":  [0.7881, 0.7910, 0.7939, 0.7967, 0.7995, 0.8023, 0.8051, 0.8078, 0.8106, 0.8133],
    "0.9":  [0.8159, 0.8186, 0.8212, 0.8238, 0.8264, 0.8289, 0.8315, 0.8340, 0.8365, 0.8389],
    "1"  :  [0.8413, 0.8438, 0.8461, 0.8485, 0.8508, 0.8531, 0.8554, 0.8577, 0.8599, 0.8621],
    "1.1":  [0.8643, 0.8665, 0.8686, 0.8708, 0.8729, 0.8749, 0.8770, 0.8790, 0.8810, 0.8830],
    "1.2":  [0.8849, 0.8869, 0.8888, 0.8907, 0.8925, 0.8944, 0.8962, 0.8980, 0.8997, 0.9015],
    "1.3":  [0.9032, 0.9049, 0.9066, 0.9082, 0.9099, 0.9115, 0.9131, 0.9147, 0.9162, 0.9177],
    "1.4":  [0.9192, 0.9207, 0.9222, 0.9236, 0.9251, 0.9265, 0.9279, 0.9292, 0.9306, 0.9319],
    "1.5":  [0.9332, 0.9345, 0.9357, 0.9370, 0.9382, 0.9394, 0.9406, 0.9418, 0.9429, 0.9441],
    "1.6":  [0.9452, 0.9463, 0.9474, 0.9484, 0.9495, 0.9505, 0.9515, 0.9525, 0.9535, 0.9545],
    "1.7":  [0.9554, 0.9564, 0.9573, 0.9582, 0.9591, 0.9599, 0.9608, 0.9616, 0.9625, 0.9633],
    "1.8":  [0.9641, 0.9649, 0.9656, 0.9664, 0.9671, 0.9678, 0.9686, 0.9693, 0.9699, 0.9706],
    "1.9":  [0.9713, 0.9719, 0.9726, 0.9732, 0.9738, 0.9744, 0.9750, 0.9756, 0.9761, 0.9767],
    "2"  :  [0.9772, 0.9778, 0.9783, 0.9788, 0.9793, 0.9798, 0.9803, 0.9808, 0.9812, 0.9817],
    "2.1":  [0.9821, 0.9826, 0.9830, 0.9834, 0.9838, 0.9842, 0.9846, 0.9850, 0.9854, 0.9857],
    "2.2":  [0.9861, 0.9864, 0.9868, 0.9871, 0.9875, 0.9878, 0.9881, 0.9884, 0.9887, 0.9890],
    "2.3":  [0.9893, 0.9896, 0.9898, 0.9901, 0.9904, 0.9906, 0.9909, 0.9911, 0.9913, 0.9916],
    "2.4":  [0.9918, 0.9920, 0.9922, 0.9925, 0.9927, 0.9929, 0.9931, 0.9932, 0.9934, 0.9936],
    "2.5":  [0.9938, 0.9940, 0.9941, 0.9943, 0.9945, 0.9946, 0.9948, 0.9949, 0.9951, 0.9952],
    "2.6":  [0.9953, 0.9955, 0.9956, 0.9957, 0.9959, 0.9960, 0.9961, 0.9962, 0.9963, 0.9964],
    "2.7":  [0.9965, 0.9966, 0.9967, 0.9968, 0.9969, 0.9970, 0.9971, 0.9972, 0.9973, 0.9974],
    "2.8":  [0.9974, 0.9975, 0.9976, 0.9977, 0.9977, 0.9978, 0.9979, 0.9979, 0.9980, 0.9981],
    "2.9":  [0.9981, 0.9982, 0.9982, 0.9983, 0.9984, 0.9984, 0.9985, 0.9985, 0.9986, 0.9986],
    "3"  :  [0.9987, 0.9987, 0.9987, 0.9988, 0.9988, 0.9989, 0.9989, 0.9989, 0.9990, 0.9990],
    "3.1":  [0.9990, 0.9991, 0.9991, 0.9991, 0.9992, 0.9992, 0.9992, 0.9992, 0.9993, 0.9993],
    "3.2":  [0.9993, 0.9993, 0.9994, 0.9994, 0.9994, 0.9994, 0.9994, 0.9995, 0.9995, 0.9995],
    "3.3":  [0.9995, 0.9995, 0.9995, 0.9996, 0.9996, 0.9996, 0.9996, 0.9996, 0.9996, 0.9997],
    "3.4":  [0.9997, 0.9997, 0.9997, 0.9997, 0.9997, 0.9997, 0.9997, 0.9997, 0.9997, 0.9998]
}
const CUHKgradePercentage = {
  "A": 0.1,
  "A-": 0.3,
  "B-": 0.6,
  "C-": 0.9,
  "D": 1
}
function round(value, decimalPlaces){
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(value * factor) / factor;
};
function percentile(arr, p) {
    if (arr.length === 0) return 0;
    if (typeof p !== 'number') throw new TypeError('p must be a number');
    if (p <= 0) return arr[0];
    if (p >= 1) return arr[arr.length - 1];

    var index = arr.length * p,
        lower = Math.floor(index),
        upper = lower + 1,
        weight = index % 1;

    if (upper >= arr.length) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
}
function findPercentile(arr, point) {
  var index1 = 0;
  var index2 = 0;
  var p = 0;
  for (let i =0;i<arr.length;i++){
    if (point>arr[i]){
      index1=i-1;
      index2=i;
      break;
    } else if (point==arr[i]){
      index1=i;
      index2=i;
      break;
    }
  }
  console.log(point);
  console.log(index1);
  console.log(index2);
  var diff1 = arr[index1] - arr[index2];
  var diff2 = arr[index1] - point;
  if (diff1==0){
    diff1 = 1;
    diff2 = 1;
  }
  var weight = diff2/diff1;
  p = (weight + index1)/arr.length;
  return round(p,4);
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
    $('#gradeTable #percent-'+gradeRange[i].label.text).html((num/scores.length*100).toFixed(2)+"%");
  }
}
function suggestArea (chart, am4core, gradeRange, series, outputData, max, min) {
  var finalUseObj = {};
  var gradePercentage = {};
  $('#suggestTable > tbody > tr').each(function() {
    var grade = $(this).find("th").text();
    var value = $(this).find("td").find("input").val();
    console.log("grade "+grade);
    console.log("value "+value);
    if (value > 0){
      gradePercentage[grade] = value/100;
    }
  });
  console.log(gradePercentage);
  if (!jQuery.isEmptyObject(gradePercentage)){
    finalUseObj = gradePercentage;
  } else {
    finalUseObj = CUHKgradePercentage;
  }
  let gradeCutOff = [];
  //let MaxMinProb = probabilityBetween(max, min, mean, stdDev);
  console.log(outputData);
  var scoreArr = [];
  for (var i = outputData.length-1;i>=0;i--){
    scoreArr.push(outputData[i].score);
  }
  console.log(scoreArr);
  var gradeArr = [];
  var tmpCum = [];
  for (var grade in finalUseObj){
    console.log(grade);
    gradeArr.push(grade);
    console.log(finalUseObj[grade]);
    tmpCum.push(finalUseObj[grade]);
    console.log(percentile(scoreArr,finalUseObj[grade]))
    gradeCutOff.push(percentile(scoreArr,finalUseObj[grade]));
  }
  for(var i=0;i<gradeCutOff.length;i++){
    console.log(gradeArr[i])
    if(i==0){
      insertArea (chart, am4core, gradeRange, gradeArr[i], chart.xAxes.getIndex(0), series, gradeCutOff[i], max);
    } else if (i==gradeCutOff.length-1){
      insertArea (chart, am4core, gradeRange, gradeArr[i], chart.xAxes.getIndex(0), series, min, gradeCutOff[i-1]);
    } else {
      insertArea (chart, am4core, gradeRange, gradeArr[i], chart.xAxes.getIndex(0), series, gradeCutOff[i], gradeCutOff[i-1]);
    }
    updateAreaRatio(gradeRange,scoreArr);
  }
  for (var i in gradeRange) {
    var value = findPercentile(scoreArr,gradeRange[i].value);
    console.log("percentile: "+findPercentile(scoreArr,gradeRange[i].value));
    $('#gradeTable #percentile-'+gradeRange[i].label.text).html(value*100+"%");
    if(gradeRange[i].value<scoreArr[scoreArr.length-1]){
      $('#gradeTable #cutoff-'+gradeRange[i].label.text).html((scoreArr[scoreArr.length-1]).toFixed(2));
    } else {
      $('#gradeTable #cutoff-'+gradeRange[i].label.text).html((gradeRange[i].value).toFixed(2));
    }
  }

}

function moveCursor (chart, sid) {
  for (var i in chart.data){
    if (chart.data[i].sid==sid){
      console.log("found "+sid)
      $("html, body").animate({ scrollTop: 0 }, "slow");
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

function calculateWeightChartData (weight, fields) {
  let weightData = [];
  for (let i = 0; i < weight.length; i++) {
    var newWeighting = {};
    if (weight[i] > 0) {
      newWeighting.component = fields[i];
      newWeighting.weighting = weight[i];
      weightData.push(newWeighting);
    }
  }
  return weightData;
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
