require([
    "d3",
    "underscore"
],
function(
    d3,
    _
) {
    var margin = {
            "top": 80,
            "right": 10,
            "bottom": 80,
            "left": 10
        },
        label_spacing = 12,
        label_alpha = 0.5,
        width = 2000 - margin.left - margin.right,
        height = 1000 - margin.top - margin.bottom,
        radius = Math.min(width, height) / 2,
        radius_label = radius + 20,
        thickness = 50,
        length_inner = 2 * Math.sqrt(Math.pow(radius, 2) / 2);

    var svg = d3.select("body")
        .append("svg")
            .attr({
                "width": width + margin.left + margin.right,
                "height": height + margin.top + margin.bottom
            })
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .append("g")
            .attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");

    d3.json("/data/schedule_e.json", function(json) {
        var data = {};

        data.outer = _(json.results).map(function(v) {
            v.spent = parseInt(v.spent);

            return v;
        });

        data.inner = _(data.outer).chain()
            .groupBy("candidate")
            .map(function(v, k) {
                return {
                    "name": k,
                    "data": v
                };
            })
            .value();

        var outer = svg
            .append("g")
                .attr("class", "outer");

        var color_outer = d3.scale.category20b();

        var arc_outer = d3.svg.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius);

        var pie_outer = d3.layout.pie()
            .value(function(d) {
                return d.spent;
            })
            .sort(null);

        var path_outer = outer.selectAll("g.arc_outer")
            .data(pie_outer(data.outer))
            .enter()
            .append("g")
                .attr("class", "arc_outer")
                .on("mouseover", function(d, i) {
                    outer.selectAll("g.arc_outer")
                        .filter(function(dd) {
                            return JSON.stringify(d.data) !== JSON.stringify(dd.data);
                        })
                        .transition()
                        .style("opacity", 0.1);

                    inner.selectAll("g.arc_inner")
                        .filter(function(dd) {
                            return JSON.stringify(d.data) !== JSON.stringify(dd.data);
                        })
                        .transition()
                        .style("opacity", 0.1);

                    inner.selectAll("image")
                        .filter(function(dd) {
                            return d.data.candidate !== dd.name;
                        })
                        .transition()
                        .style("opacity", 0.1);
                })
                .on("mouseout", function(d) {
                    outer.selectAll("g.arc_outer")
                        .transition()
                        .style("opacity", 1.0);

                    inner.selectAll("g.arc_inner")
                        .transition()
                        .style("opacity", 1.0);

                    inner.selectAll("image")
                        .transition()
                        .style("opacity", 1.0);
                })
            .append("path")
                .attr("d", arc_outer)
                .attr("fill", function(d, i) {
                    return color_outer(d.data["committee.name"]);
                })
                .each(function(d) {
                    this._current = d;
                });

        // https://jsfiddle.net/thudfactor/HdwTH/
        var label_outer = outer.selectAll("g.arc_outer")
            .append("g")
                .attr("class", "label")

        var label_circle = label_outer
            .append("circle")
                .attr({
                    "x": 0,
                    "y": 0,
                    "r": 2,
                    "transform": function (d, i) {
                        return "translate(" + arc_outer.centroid(d) + ")";
                    },
                    "class": "label-circle"
                })
                .each(function(d) {
                    this._current = d;
                });

        var label_line = label_outer
            .append("line")
                .attr({
                    "x1": function (d) {
                        return arc_outer.centroid(d)[0];
                    },
                    "y1": function (d) {
                        return arc_outer.centroid(d)[1];
                    },
                    "x2": function (d) {
                        centroid = arc_outer.centroid(d);
                        mid_angle = Math.atan2(centroid[1], centroid[0]);
                        x = Math.cos(mid_angle) * radius_label;
                        return x;
                    },
                    "y2": function (d) {
                        centroid = arc_outer.centroid(d);
                        mid_angle = Math.atan2(centroid[1], centroid[0]);
                        y = Math.sin(mid_angle) * radius_label;
                        return y;
                    },
                    "class": "label-line"
                })
                .each(function(d) {
                    this._current = d;
                });


        var label_text = label_outer
            .append("text")
                .attr({
                    "x": function (d) {
                        centroid = arc_outer.centroid(d);
                        mid_angle = Math.atan2(centroid[1], centroid[0]);
                        x = Math.cos(mid_angle) * radius_label;
                        sign = (x > 0) ? 1 : -1
                        labelX = x + (5 * sign)
                        return labelX;
                    },
                    "y": function(d) {
                        centroid = arc_outer.centroid(d);
                        mid_angle = Math.atan2(centroid[1], centroid[0]);
                        y = Math.sin(mid_angle) * radius_label;
                        return y;
                    },
                    "text-anchor": function (d) {
                        centroid = arc_outer.centroid(d);
                        mid_angle = Math.atan2(centroid[1], centroid[0]);
                        x = Math.cos(mid_angle) * radius_label;
                        return (x > 0) ? "start" : "end";
                    },
                    "class": "label-text"
                })
                .text(function (d) {
                    return d.data["committee.name"];
                })
                .each(function(d) {
                    this._current = d;
                });

        function label_relax() {
            again = false;
            label_text
                .filter(function(d) {
                    return !d3.select(this.parentNode).attr("visibility") || d3.select(this.parentNode).attr("visibility") !== "hidden";
                })
                .each(function(d) {
                    a = this;
                    da = d3.select(a);
                    y1 = da.attr("y");
                    label_text
                        .filter(function(d) {
                            return !d3.select(this.parentNode).attr("visibility") || d3.select(this.parentNode).attr("visibility") !== "hidden";
                        })
                        .each(function (d) {
                            b = this;
                            // a & b are the same element and don't collide.
                            if (a == b) return;
                            db = d3.select(b);
                            // a & b are on opposite sides of the chart and
                            // don't collide
                            if (da.attr("text-anchor") != db.attr("text-anchor")) return;
                            // Now let's calculate the distance between
                            // these elements.
                            y2 = db.attr("y");
                            delta_y = y1 - y2;

                            // Our spacing is greater than our specified spacing,
                            // so they don't collide.
                            if (Math.abs(delta_y) > label_spacing) return;

                            // If the labels collide, we'll push each
                            // of the two labels up and down a little bit.
                            again = true;
                            sign = delta_y > 0 ? 1 : -1;
                            adjust = sign * label_alpha;
                            da.attr("y", +y1 + adjust);
                            db.attr("y", +y2 - adjust);
                        });
                });
            // Adjust our line leaders here
            // so that they follow the labels.
            if(again) {
                label_elements = label_text[0];
                label_line.attr("y2",function(d, i) {
                    label_for_line = d3.select(label_elements[i]);
                    return label_for_line.attr("y");
                });
                setTimeout(label_relax,20)
            }
        }

        label_relax();

        var inner = svg
            .append("g")
                .attr({
                    "class": "inner",
                    "transform": "translate(" + -(length_inner / 2) + "," + -(length_inner / 2) + ")"
                });

        var bubble_inner = d3.layout.pack()
            .value(function(d) {
                return _(d.data).chain()
                    .pluck("spent")
                    .reduce(function(memo, num) {
                        return memo + num;
                    }, 0)
                    .value();
            })
            .sort(null)
            .size([length_inner, length_inner])
            .padding(10);

        var node_inner = inner.selectAll("g.node_inner")
            .data(
                bubble_inner.nodes({ children: data.inner })
                    .filter(function(d) {
                        return !d.children;
                    })
            )
            .enter()
            .append("g")
                .attr({
                    "class": function(d) {
                        return "node_inner " + d.name;
                    },
                    "transform": function(d) {
                        return "translate(" + d.x + "," + d.y + ")";
                    }
                });

        var arc_inner = d3.svg.arc();

        var pie_inner = d3.layout.pie()
            .value(function(d) {
                return d.spent;
            })
            .sort(null);

        var path_inner = node_inner.selectAll("g.arc_inner")
            .data(function(d) {
                return pie_inner(d.data).map(function(m) {
                    m.r = d.r;
                    return m;
                });
            })
            .enter()
            .append("g")
                .attr("class", "arc_inner")
                .on("mouseover", function(d, i) {
                    inner.selectAll("g.arc_inner")
                        .filter(function(dd) {
                            return JSON.stringify(d.data) !== JSON.stringify(dd.data);
                        })
                        .transition()
                        .style("opacity", 0.1);

                    outer.selectAll("g.arc_outer")
                        .filter(function(dd) {
                            return JSON.stringify(d.data) !== JSON.stringify(dd.data);
                        })
                        .transition()
                        .style("opacity", 0.1);

                    inner.selectAll("image")
                        .filter(function(dd) {
                            return d.data.candidate !== dd.name;
                        })
                        .transition()
                        .style("opacity", 0.1);
                })
                .on("mouseout", function(d) {
                    inner.selectAll("g.arc_inner")
                        .transition()
                        .style("opacity", 1.0);

                    outer.selectAll("g.arc_outer")
                        .transition()
                        .style("opacity", 1.0);

                    inner.selectAll("image")
                        .transition()
                        .style("opacity", 1.0);
                })
            .append("path")
                .attr("d", function(d) {
                    d.innerRadius = d.r - thickness;
                    d.outerRadius = d.r;

                    return arc_inner(d);
                })
                .style("fill", function(d, i) {
                    return d.data.toward === "supporting" ? "#2ca02c" : "d62728";
                })
                .each(function(d) {
                    this._current = d;
                });

        var image_clip = node_inner
            .append("defs")
            .append("clipPath")
                .attr("id", function(d) {
                    return "clip_" + d.name;
                })
            .append("circle")
                .attr({
                    "cx": 0,
                    "cy": 0,
                    "r": function(d) {
                        return d.r - thickness;
                    }
                });

        var image = node_inner
            .append("image")
                .attr({
                    "x": function(d) {
                        return thickness - d.r;
                    },
                    "y": function(d) {
                        return thickness - d.r;
                    },
                    "width": function(d) {
                        return 2 * (d.r - thickness);
                    },
                    "height": function(d) {
                        return 2 * (d.r - thickness);
                    },
                    "xlink:href": function(d) {
                        return "/images/" + d.name + "_head.jpg";
                    }
                })
                .style("clip-path", function(d) {
                    return "url(#clip_" + d.name + ")";
                })
                .on("mouseover", function(d, i) {
                    inner.selectAll("g.arc_inner")
                        .filter(function(dd) {
                            return d.name !== dd.data.candidate;
                        })
                        .transition()
                        .style("opacity", 0.1);

                    outer.selectAll("g.arc_outer")
                        .filter(function(dd) {
                            return d.name !== dd.data.candidate;
                        })
                        .transition()
                        .style("opacity", 0.1);

                    inner.selectAll("image")
                        .filter(function(dd) {
                            return d.name !== dd.name;
                        })
                        .transition()
                        .style("opacity", 0.1);
                })
                .on("mouseout", function(d) {
                    inner.selectAll("g.arc_inner")
                        .transition()
                        .style("opacity", 1.0);

                    outer.selectAll("g.arc_outer")
                        .transition()
                        .style("opacity", 1.0);

                    inner.selectAll("image")
                        .transition()
                        .style("opacity", 1.0);
                });

        d3.selectAll("#toward_controls input")
            .on("change", function() {
                var toward = this.value;

                pie_outer.value(function(d) {
                    return d.toward === toward || toward === "both" ? d.spent : 0;
                });

                path_outer = path_outer.data(pie_outer(data.outer));

                path_outer
                    .transition()
                        .duration(750)
                        .attrTween("d", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                return arc_outer(interpolate(t));
                            };
                        });

                label_outer
                    .attr("visibility", "visible")
                    .transition()
                        .duration(750)
                        .style("opacity", function(d) {
                            return d.data.toward === toward || toward === "both" ? 1.0 : 0.0;
                        })
                        .each("end", function() {
                            d3.select(this).attr("visibility", function(d) {
                                return d.data.toward === toward || toward === "both" ? "visible" : "hidden";
                            });
                        });

                label_circle = label_circle.data(pie_outer(data.outer));

                label_circle
                    .transition()
                        .duration(750)
                        .attrTween("transform", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                return "translate(" + arc_outer.centroid(interpolate(t)) + ")";
                            };
                        });

                label_line = label_line.data(pie_outer(data.outer));

                label_line
                    .transition()
                        .duration(750)
                        .attrTween("x1", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                return arc_outer.centroid(interpolate(t))[0];
                            };
                        })
                        .attrTween("y1", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                return arc_outer.centroid(interpolate(t))[1];
                            };
                        })
                        .attrTween("x2", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                var c = arc_outer.centroid(interpolate(t));
                                var mid_angle = Math.atan2(c[1], c[0]);
                                return Math.cos(mid_angle) * radius_label;
                            };
                        })
                        .attrTween("y2", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                var c = arc_outer.centroid(interpolate(t));
                                var mid_angle = Math.atan2(c[1], c[0]);
                                return Math.sin(mid_angle) * radius_label;
                            };
                        });

                label_text = label_text.data(pie_outer(data.outer));

                label_text
                    .transition()
                        .duration(750)
                        .attrTween("x", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                var c = arc_outer.centroid(interpolate(t));
                                var mid_angle = Math.atan2(c[1], c[0]);
                                var x = Math.cos(mid_angle) * radius_label;
                                var sign = (x > 0) ? 1 : -1;
                                return x + (5 * sign);
                            };
                        })
                        .attrTween("y", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                var c = arc_outer.centroid(interpolate(t));
                                var mid_angle = Math.atan2(c[1], c[0]);
                                var y = Math.sin(mid_angle) * radius_label;
                                return y;
                            };
                        })
                        .attrTween("text-anchor", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                var c = arc_outer.centroid(interpolate(t));
                                var mid_angle = Math.atan2(c[1], c[0]);
                                var x = Math.cos(mid_angle) * radius_label;
                                return (x > 0) ? "start" : "end";
                            };
                        })
                        .each("end", label_relax);

                bubble_inner.value(function(d) {
                    return _(d.data).chain()
                        .filter(function(v) {
                            return v.toward === toward || toward === "both";
                        })
                        .pluck("spent")
                        .reduce(function(memo, num) {
                            return memo + num;
                        }, 0)
                        .value();
                });

                node_inner
                    .data(
                        bubble_inner.nodes({ children: data.inner })
                            .filter(function(d) {
                                return !d.children;
                            })
                    )
                    .transition()
                        .duration(750)
                        .attr("transform", function(d) {
                            return "translate(" + d.x + "," + d.y + ")"
                        });

                image_clip
                    .transition()
                        .duration(750)
                        .attr("r", function(d) {
                            return d.r - thickness;
                        });

                image
                    .transition()
                        .duration(750)
                        .attr({
                            "x": function(d) {
                                return thickness - d.r;
                            },
                            "y": function(d) {
                                return thickness - d.r;
                            },
                            "width": function(d) {
                                return 2 * (d.r - thickness);
                            },
                            "height": function(d) {
                                return 2 * (d.r - thickness);
                            }
                        });

                pie_inner.value(function(d) {
                    return d.toward === toward || toward === "both" ? d.spent : 0;
                });

                path_inner
                    .data(function(d) {
                        return pie_inner(d.data).map(function(m) {
                            m.r = d.r;
                            return m;
                        })
                    })
                    .transition()
                        .duration(750)
                        .attrTween("d", function(d) {
                            d.innerRadius = d.r - thickness;
                            d.outerRadius = d.r;
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);

                            return function(t) {
                                return arc_inner(interpolate(t));
                            };
                        });
            });
    });
});
