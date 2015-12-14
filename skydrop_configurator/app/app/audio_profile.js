"use strict";

//chart cfg
Chart.defaults.global.responsive = true;
Chart.defaults.global.animation = false;

Chart.defaults.global.scaleStartValue = 0;
Chart.defaults.global.scaleStepWidth = 150;
Chart.defaults.global.scaleSteps = 10;
Chart.defaults.global.scaleOverride = true;

Chart.defaults.Line.bezierCurve = false;

app.controller("audioProfile", ['$scope', '$http', 'memory', "ChartJs", function ($scope, $http, memory, chartjs) {
	var promise = memory.getAllValues();
	var audio = false;

	$scope.demo_val = 0.0;

    try 
    {
        audio = new Audio();
    }
    catch(err) 
    {
        audio = false;
    }            

	$scope.list = {};

	promise.then(function (data){
		$scope.list = data;
		$scope.refresh();
	});
	
	//rebind all data when they change (for load cfg)
    $scope.$watch(
    	function(){return memory.data_load;},
    	function (new_val, old_val){
    		$scope.list = memory.data_holder;

    		$scope.refresh();
    	}
    );	

    $scope.refresh = function()
    {
    	var freq = [];
    	var pause = [];
    	var length = [];
    	
    	for (var i=0; i < 41; i++)
    	{
    		freq.push(memory.getActualValue("cfg_audio_profile_freq_" + i));
    		length.push(memory.getActualValue("cfg_audio_profile_length_" + i));
    		pause.push(memory.getActualValue("cfg_audio_profile_pause_" + i));
    	}
    
    	$scope.data = [freq, length, pause];  
    };
	
	$scope.labels = [];
	
	for (var i = -10 ; i <= 10; i += 0.5)
		$scope.labels.push(i + " m/s");
	
	$scope.series = ['Frequency [Hz]', 'Length [ms]', 'Pause [ms]'];
		
	$scope.data = [];
	$scope.point_drag = false;
	$scope.point_series = false;
	$scope.point_index = false;
	$scope.c_freq = "N/A";
	$scope.c_leng = "N/A";
	$scope.c_paus = "N/A";
	$scope.c_state = "Idle";
	
	$scope.onHover = function (points, evt, chart) 
	{

		if ($scope.point_drag)
		{
			$scope.point_index = points[0].index;
			
			var name = ["cfg_audio_profile_freq_", "cfg_audio_profile_length_", "cfg_audio_profile_pause_"][$scope.point_series] + $scope.point_index;
			
			var val = memory.getActualValue(name);
			var y = evt.layerY;

			
			val = in_range(chart.scale.calculateVal(y), 0, 2000);
			
			//store to data holder
			memory.setActualValue(name, val);
			//update graph
			$scope.data[$scope.point_series][$scope.point_index] = val;    
		}
	};	
	
	$scope.onUp = function(points, evt)
	{
		$scope.point_drag = false;
	};

	$scope.onDown = function(points, evt)
	{
//	    console.log("Down", points, evt);
	    var x = evt.layerX;
	    var y = evt.layerY;
	    
	    var dist = false;
	    
	    for (var i in points)
    	{
	    	var point = points[i];
	    	
	    	var p_dist = Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2); 
	    	
	    	if (p_dist < dist || !dist)
	    	{
	    		dist = p_dist;
	    		$scope.point_series = $scope.series.indexOf(point.datasetLabel);
	    		$scope.point_index = point.index;
	    		$scope.point_drag = true;
	    	}
    	
    	}
	};
	
	$scope.demoFormat = function(value)
	{
	    if (value < 0)
	        return "Sink " + value + " m/s";
	    else
    	    return "Lift " + value + " m/s";
	};
	
	$scope.demo_dec = function()
	{
	    if ($scope.demo_val > -10.0)
    	    $scope.demo_val -= 0.1;
    	$scope.onDemoSlide($scope.demo_val);
   	};

	$scope.demo_inc = function()
	{
	    if ($scope.demo_val < 10.0)
    	    $scope.demo_val += 0.1;
    	$scope.onDemoSlide($scope.demo_val);
	};
	
	$scope.onDemoSlide = function(value)
	{
        function get_near(vario, src)
        {
	        vario = vario * 2; //1 point for 50cm
	        var findex = Math.floor(vario) +  20;
	        var m = vario - Math.floor(vario);

	        var index = findex;

	        if (findex > 39)
	        {
		        index = 39;
		        m = 1.0;
	        }

	        if (findex < 0)
	        {
		        index = 0;
		        m = 0.0;
	        }

	        var start = src[index];

	        start = start + (src[index + 1] - start) * m;

	        return start;
        };	
	    var ivario = value * 100; //in cm now

	    var lift = memory.getActualValue("cfg_audio_profile_lift");
	    var sink = memory.getActualValue("cfg_audio_profile_sink");
	    var weak_lift = memory.getActualValue("cfg_vario_weak_lift");
	    var weak_lift_freq = memory.getActualValue("cfg_audio_profile_weak_lift_freq");
	    
	    if (memory.getActualValue("cfg_vario_weak_lift_enabled"))
	    {
	        var buzz_thold = (lift - weak_lift);
	        
	        if (ivario >= buzz_thold && ivario < lift && ivario > sink)
	        {
        
	            var beep_freq = get_near(lift / 100.0, $scope.data[0]);
	            beep_freq -= weak_lift_freq;
	            
	            var c_freq = weak_lift_freq + (beep_freq * (ivario - buzz_thold)) / weak_lift;
	            
	            $scope.c_state = "Weaklift";
	            $scope.c_freq = Math.round(c_freq) + " Hz";
	            $scope.c_paus = "N/A";
	            $scope.c_leng = "N/A";
	            $scope.play_beep(c_freq, 0, 0);
	            return;
	        }
	        
	    }
	    
	    if (ivario >= lift || ivario <= sink)
	    {
	        var c_freq = get_near(ivario / 100.0, $scope.data[0]);
	        var c_leng = get_near(ivario / 100.0, $scope.data[1]);
	        var c_paus = get_near(ivario / 100.0, $scope.data[2]);
	        
            $scope.c_state = (ivario >= lift) ? "Lift" : "Sink";
            $scope.c_freq = Math.round(c_freq) + " Hz";;
            $scope.c_paus = (c_paus) ? Math.round(c_paus) + " ms" : "N/A";
            $scope.c_leng = (c_leng) ? Math.round(c_leng) + " ms" : "N/A";
            $scope.play_beep(c_freq, c_leng, c_paus);
            return;	        
	    }
	    
        $scope.c_state = "Idle";
        $scope.c_freq = "N/A";
        $scope.c_paus = "N/A";
        $scope.c_leng = "N/A";
        
        if (!audio.paused)
            audio.pause();        
	};
	
	// freq in Hz
	// len in ms
	// pause in ms
	$scope.play_beep = function(freq, leng, paus)
	{
	    if (audio == false)
	        return;
	        
        if (!audio.paused)
            audio.pause();
	
        console.log("generating demo for", freq, leng, paus);
        var rate = 31250;
        
        var data = [];
        
        var T = (rate / freq);
        
        // duration in sec
        var duration = 3;
        
        for (var i=0; i< rate * duration; i++) 
        {
            var ms = (i / rate) * 1000;
            if (ms % (leng + paus) <= leng || (leng == 0 && paus == 0))
            {
                var val;
            
                if (i % T < T/2)
                    val = 255;
                else
                    val = 0;
                    
                data[i] = val;
            }
            else
            {
                data[i] = data[i - 1];
            }
        }
            
        var wave = new RIFFWAVE(); // create the wave file
        
        wave.header.sampleRate = rate;
        wave.Make(data);
        
        audio.src = wave.dataURI; // create the HTML5 audio element
        audio.play(); 
    };
	
}]);
