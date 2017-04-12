define([
    "jquery",
    "d3",
    "underscore",
    "js/helper"
],
function(
    $,
    d3,
    _,
    helper
) {
    return function(data) {
        var margin = {
                "top": 10,
                "right": 10,
                "bottom": 10,
                "left": 10
            },
            green = data.green,
            red = data.red,
            width = Math.min($("#viz_pies").parent().innerWidth(), 850) - margin.left - margin.right,
            height = width * 0.5 - margin.top - margin.bottom,
            chart_height = height * 0.8;
            radius = chart_height / 2 * 0.8,
            thickness = radius * 0.2,
            font_size = height * 0.05;

        var legend_data = [
            {
                "data": [
                    {
                        "name": "Supporting expenditure $",
                        "type": "shape",
                        "color": green
                    },
                    {
                        "name": "Opposing expenditure $",
                        "type": "shape",
                        "color": red
                    }
                ]
            }
        ];

        var svg = d3.select("svg#viz_pies")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", "translate(" + [margin.left, margin.top] + ")");

        var pie = d3.pie()
            .value(function(d) {
                return d.total;
            })
            .sort(function cmp(a, b) {
                return d3.descending(a.toward, b.toward);
            });

        var arc = d3.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius);

        var candidate_g = svg.selectAll("g.candidate")
            .data(data.stats.candidate)
            .enter()
            .append("g")
                .attr("class", "candidate")
                .attr("transform", function(d, i) {
                    var x = (2 * i + 1) * width / (2 * data.stats.candidate.length);
                    var y = chart_height * 0.8 / 2;

                    return "translate(" + [x, y] + ")";
                });

        var text = candidate_g
            .append("text")
                .attr("class", "candidate_total")
                .attr("x", 0)
                .attr("y", radius * 1.25)
                .attr("text-anchor", "middle")
                .style("fill", "white")
                .style("font-size", font_size)
                .text(function(d) {
                    return "$" + helper.dollar_format(d.total) + " spent on " + d.candidate.capitalize();
                });

        var legend_g = svg
            .append("g")
                .attr("class", "legend")
                .attr("transform", "translate(" + [0, chart_height] +")");

        var legend_sub = legend_g.selectAll("g.sub")
            .data(legend_data)
            .enter()
            .append("g")
                .attr("class", "sub")
                .attr("transform", function(d, i) {
                    return "translate(" + [width / legend_data.length * i + width * 0.4, height * 0.05] + ")";
                });

        var legend_label_g = legend_sub.selectAll("g.legend_label")
            .data(function(d) {
                return d.data;
            })
            .enter()
            .append("g")
                .attr("class", "legend_label")
                .attr("transform", function(d, i) {
                    return "translate(" + [0, font_size * 1.5 * i] + ")";
                });

        legend_label_g
            .append("path")
                .attr("class", function(d) {
                    return d.type;
                })
                .attr("d", function(d) {
                    var h = thickness,
                        w = width * 0.05;

                    return "M0 0 l-" + w + " 0 l0 " + h + " l" + w + " 0 Z";
                })
                .attr("stroke", function(d) {
                    return d.color;
                })
                .attr("fill", function(d) {
                    return d.color;
                })
                .attr("transform", "translate(" + [-font_size * 0.3, -font_size * 0.9] + ")");

        legend_label_g
            .append("text")
                .style("font-size", font_size)
                .style("fill", "white")
                .text(function(d) {
                    return d.name;
                });


        var pie_data = candidate_g.selectAll("path.arc")
            .data(function(d) {
                return pie(d.toward);
            })
            .enter();

        var image = candidate_g
            .append("image")
                .attr("x", function(d) {
                    return thickness - radius;
                })
                .attr("y", function(d) {
                    return thickness - radius;
                })
                .attr("width", function(d) {
                    return 2 * (radius - thickness);
                })
                .attr("height", function(d) {
                    return 2 * (radius - thickness);
                })
                .attr("xlink:href", function(d) {
                    return "/images/" + d.candidate + "_head.png";
                })
                .on("mouseover", function(d) {
                    var html = d.candidate.capitalize() + "<br><i>Click for more details</i>";
                    helper.tooltip
                        .style("visibility", "visible")
                        .html(html);
                })
                .on("mousemove", helper.tooltip_position)
                .on("mouseout", function(d) {
                    helper.tooltip.style("visibility", "hidden");
                })
                .on("click", function(d) {
                    var candidate_id = d.candidate_id;

                    window.open("https://beta.fec.gov/data/candidate/" + candidate_id, "_blank");
                });

        var arc_path = pie_data
            .append("path")
                .attr("class", "arc")
                .attr("d", function(d) {
                    return arc(d);
                })
                .style("fill", function(d) {
                    return d.data.toward === "supporting" ? green : red;
                })
                .on("mouseover", function(d) {
                    var toward = d.data.toward,
                        candidate = d.data.candidate,
                        name = candidate.capitalize(),
                        spent = d.data.total,
                        total = _(data.stats.candidate).findWhere({"candidate": candidate}).total,
                        pct = Math.round(spent / total * 100);

                    helper.tooltip
                        .style("visibility", "visible")
                        .text(
                            "$" + helper.dollar_format(spent) + " (" + helper.pct_label(pct) + ") spent " + toward + " " + name
                        );;
                })
                .on("mousemove", helper.tooltip_position)
                .on("mouseout", function(d) {
                    helper.tooltip.style("visibility", "hidden");
                });
    };
});
