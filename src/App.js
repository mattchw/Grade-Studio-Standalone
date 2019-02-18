import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";

am4core.useTheme(am4themes_animated);

const dummyData = [
  {
    sid: '1',
    score: 10
  },
  {
    sid: '2',
    score: 13
  },
  {
    sid: '3',
    score: 20
  },
  {
    sid: '4',
    score: 35
  },
  {
    sid: '5',
    score: 40
  },
  {
    sid: '6',
    score: 45
  },
  {
    sid: '7',
    score: 47
  },
  {
    sid: '8',
    score: 49
  },
  {
    sid: '9',
    score: 70
  }
]

class App extends Component {
  calculateMeanScore( scores ) {
	  var total = 0.0;
	  for(var i=0; i<scores.length; i++){
	    total += scores[i];
	  }

	  return total/scores.length;
	}
  standardDeviation(scores){
    var avg = this.calculateMeanScore(scores);

    var squareDiffs = scores.map(function(value){
      var diff = value - avg;
      var sqrDiff = diff * diff;
      return sqrDiff;
    });

    var avgSquareDiff = this.calculateMeanScore(squareDiffs);

    var stdDev = Math.sqrt(avgSquareDiff);
    return stdDev;
  }
  NormalDensityZx( x, Mean, StdDev ) {
      var a = x - Mean;
      return Math.exp( -( a * a ) / ( 2 * StdDev * StdDev ) ) / ( Math.sqrt( 2 * Math.PI ) * StdDev );
  }
  componentDidMount() {
    let chart = am4core.create("chartdiv", am4charts.XYChart);

    chart.paddingRight = 20;

    let data = [];
    var scores = [];
    var mean = -1;
    var stdDev = -1;
    for(var i in dummyData){
			scores.push(dummyData[i].score);
		}

    mean = this.calculateMeanScore(scores);
    console.log(mean);

    stdDev = this.standardDeviation(scores);
    console.log(stdDev);

    for(var i=0;i<dummyData.length;i++){
			var new_data = {};
			new_data.sid = dummyData[i].sid;
			new_data.score = dummyData[i].score;
			new_data.value = this.NormalDensityZx(scores[i], mean, stdDev);
			new_data.grade = '';
			data.push(new_data);
		}

    console.table(data);
    chart.data = data;

    var xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    xAxis.dataFields.category = "score";

    var yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.dataFields.value = "value";
    yAxis.min = 0;
    yAxis.max = 0.1;

    let series = chart.series.push(new am4charts.LineSeries());
    series.dataFields.categoryX = "score";
    series.dataFields.valueY = "value";

    series.tooltipText = "{valueY.value}";
    chart.cursor = new am4charts.XYCursor();

    let scrollbarX = new am4charts.XYChartScrollbar();
    scrollbarX.series.push(series);
    chart.scrollbarX = scrollbarX;

    this.chart = chart;
  }

  componentWillUnmount() {
    if (this.chart) {
      this.chart.dispose();
    }
  }

  render() {
    return (
      <div>
        <div id="chartdiv" style={{ width: "100%", height: "500px" }}></div>
        <button>hi</button>
      </div>
    );
  }
}

export default App;
