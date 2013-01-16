var _EOC = (function(window, document, undefined){
	var oreData = [],
		mineralData = [],
		counter = 0;
		
	
	var Ore = function(data){
		this.details = {
			name: data.name,
			typeId: data.typeId,
			batch: data.batch,
			security: data.security,
			volume: data.volume,
			refinesTo: data.refinesTo,
			percentIncrease: data.percentIncrease
		};
		
		return this;
	};
	
	var Mineral = function(data){
		this.details = {
			name: data.name,
			price: data.price
		}
	
		return this;
	};
	
	var setMineralPrices = function(){
		$.ajax({
		  url: "http://api.eve-central.com/api/evemon",
		  success: function(data){
			$(data).find("mineral").each(function(i){
				var mineral = new Mineral({
					name: $(this).children("name").text(), 
					price: $(this).children("price").text()
				});
				mineralData.push(mineral);
			});        
		  },
		  complete: function(){
			getOrePrices();
		  }
		});
	};
	

	var setOrePrice = function(ore){
		$.ajax({
			  url: "http://api.eve-central.com/api/marketstat",
			  data: {
				typeid: ore.details.typeId//,
				//regionlimit: 10000032
			  },
			  success: function(data){
				ore.details.price = $(data).find("sell").children("median").text();
			  },
			  complete: function(){
				counter++;
				if(counter === oreData.length){
					main();
				}
			  }
		});
	};
	
	var getOrePrices = function(){
		for(var i=0; i<ore.length; i++){
			var newOre = new Ore(ore[i]);
			setOrePrice(newOre);
			oreData.push(newOre);
		};
	};
	
	var getMineralPrices = (function(){
		setMineralPrices();
	})();
	
	var refiningEfficiency = function(){
		var station = parseFloat($("#stationEfficiency").val()),
			refiningLevel = parseInt($("#refiningLevel").val(), 10),
			refiningEfficiencyLevel = parseInt($("#refiningEfficiencyLevel").val(), 10),
			oreProcessingLevel = parseInt($("#oreProcessing").val(), 10);

		var efficiency = ((station + (0.375*( 1 + (refiningLevel*0.02))*( 1 + (refiningEfficiencyLevel*0.04))*( 1 + (oreProcessingLevel*0.05))))*100);
		return (efficiency > 100 ? 100 : efficiency);
	
	};
	
	var formatMoney = function(n, c, d, t){
		var n = (typeof n !== "Number" ? parseFloat(n) : n), 
			c = isNaN(c = Math.abs(c)) ? 2 : c, 
			d = d == undefined ? "," : d, 
			t = t == undefined ? "." : t, 
			s = n < 0 ? "-" : "", 
			i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
			j = (j = i.length) > 3 ? j % 3 : 0;
		return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	 };
			
	
		
			
	var main = function(){
			$(document).ready(function(){		
				var sorterOptions =     {
					widgets: ["zebra"], 
					widgetOptions : { 
					  zebra : [ "even", "odd" ] 
					} 
				};	
				
				var options = "<option></option>";
				for(var i=0; i<mineralData.length; i++){
					$("table#minerals tbody").append("<tr name='"+ mineralData[i].details.name +"'><td name='name'><a href='http://wiki.eveonline.com/en/wiki/" + mineralData[i].details.name + "'>"+ mineralData[i].details.name +"</td>"
											+ "<td name='price'>"+ formatMoney(mineralData[i].details.price, "2", ".", ",") +"</td>"
											+ "<td><input data-price='" + mineralData[i].details.price + "' value='0.00'></input></td>"
											+ "<td><span>0.00</span></td></tr>");
				
				}
			
				for(var k=0; k<oreData.length; k++){			
					$("table#ore tbody").append("<tr name='"+ oreData[k].details.name +"'>"
										+ "<td class='" + oreData[k].details.security + "' name='name'><a href='http://wiki.eveonline.com/en/wiki/" + oreData[k].details.name + "'>" + oreData[k].details.name +"</td>"
										+ "<td name='volume'>"+ oreData[k].details.volume + "</td>"
										+ "<td name='price'>"+ formatMoney(oreData[k].details.price, "2", ".", ",") +"</td>"
										+ "<td name='pricePerVolume'>"+ (oreData[k].details.price/oreData[k].details.volume).toFixed(2) +"</td>"
										+ "<td><input data-price='" + oreData[k].details.price + "' value='0.00'></input></td>"
										+ "<td><span>0.00</span></td></tr>");
				
				
					options += "<option value='" + oreData[k].details.name +"'>" + oreData[k].details.name + "</option>"; 
				}
				

				
				$("span#refineOre").append("<select>" + options + "</select>");
				$("#efficiency td:eq(1)").text(refiningEfficiency() + "%");
				
				$("#loader").fadeOut();
				$("div.wrapper").fadeIn();

				$("#minerals").tablesorter(sorterOptions);
				$("#ore").tablesorter(sorterOptions);
				
				$(document).on("keyup", "input", function(){		
					var price = parseFloat($(this).data("price"), 10);
					var input = parseFloat($(this).val(), 10);

					if(isNaN(input)){ input = 0; }

					$(this).parent("td").next("td").children("span").text(formatMoney(price*input, "2", ".", ","));
				});
				
				$(document).on("change", "span#refineOre > select, #refineQuantity", function(){
					if($("span#refineOre > select").selectedIndex !== 0 && $.trim($("#refineQuantity").val()) !== ""){
						var ore = oreData[$("span#refineOre > select")[0].selectedIndex-1].details,
								mineral,
								oreAmount = ($.trim($("#refineQuantity").val()) === "" ? 0 : $("#refineQuantity").val()),
								efficiency = $("#efficiency > td:eq(1)").text().replace("%", ""),
								stationTax = $("#stationTax").val(),
								quantity = 0,
								total = 0,
								text = "",
								batches = 0,
								remainder = 0;
					
						
						$.each(ore.refinesTo, function(key, val){
							for(var i=0; i<mineralData.length; i++){
								if(key === mineralData[i].details.name){
									mineral = mineralData[i].details;
								}
							}
							
							batches = (~~(oreAmount/ore.batch));
							remainder = oreAmount%ore.batch;
							quantity = batches * val;
							total = parseFloat(total) + parseFloat(mineral.price*quantity);
							efficiency = (efficiency/100)*quantity - quantity;
							stationTax = (1 + stationTax/100)*quantity - quantity;
							quantity = quantity - stationTax - efficiency;
							
							text += "<tr><td>" + key 
									+ "</td><td>" + ore.batch 
									+ "</td><td>" + batches 
									+ "</td><td>" + remainder 
									+ "</td><td>" + val
									+ "</td><td>" + quantity
									+ "</td><td>" + efficiency
									+ "</td><td>" + stationTax
									+ "</td><td>" + mineral.price
									+ "</td><td>" + (mineral.price*quantity).toFixed(2);
									+ "</td></tr>";
						});
						
						text += "<tr>"
								+ "<td colspan='9' class='emtpyCell' align='right'><b>Total ISK From Refining Ore:</b>"  
								+ "</td><td>" + formatMoney(total, "2", ".", ",")
								+ "</td></tr>"
								+ "<tr><td colspan='9' class='emtpyCell' align='right'><b>Total ISK From Selling Ore:</b>"  
								+ "</td><td>" + formatMoney((ore.price*quantity), "2", ".", ",")
								+ "<tr><td colspan='9' class='emtpyCell' align='right'><b>Difference:</b>"  
								+ "</td><td>" + formatMoney((total - (ore.price*quantity)), "2", ".", ",")
								+ "</td></tr>";
						
						$("#refinesTo").html(text);
						$("#mineralsFromOre").show();
					}
				});
				
				$(document).on("change keyup", "table#refining", function(){
					$("#efficiency td:eq(1)").text(refiningEfficiency().toFixed(2) + "%");
				});
				
				$(document).on("click", "a", function(){
					$(this).next("div.container").slideToggle();
				});
			});
	}
})(window, document);