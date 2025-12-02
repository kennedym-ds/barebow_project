import pytest
import numpy as np
from src.crawls import calculate_crawl_regression, predict_crawl, generate_crawl_chart

def test_linear_interpolation():
    # If we only have 2 points, it should be linear
    dists = [10, 50]
    crawls = [20, 0] # 20mm at 10m, 0mm at 50m
    
    model = calculate_crawl_regression(dists, crawls)
    
    # Midpoint (30m) should be exactly 10mm
    pred_30 = predict_crawl(model, 30)
    assert abs(pred_30 - 10.0) < 0.1

def test_parabolic_fit():
    # Real world data is curved.
    # 10m: 25mm
    # 30m: 10mm
    # 50m: 0mm
    dists = [10, 30, 50]
    crawls = [25, 10, 0]
    
    model = calculate_crawl_regression(dists, crawls)
    
    # Check known points
    assert abs(predict_crawl(model, 10) - 25) < 0.5
    assert abs(predict_crawl(model, 50) - 0) < 0.5
    
    # Check interpolation (20m should be between 25 and 10)
    pred_20 = predict_crawl(model, 20)
    assert 10 < pred_20 < 25

def test_chart_generation():
    dists = [10, 50]
    crawls = [20, 0]
    model = calculate_crawl_regression(dists, crawls)
    
    chart = generate_crawl_chart(model, min_dist=10, max_dist=20, step=10)
    # Should return [(10, 20.0), (20, 15.0)]
    assert len(chart) == 2
    assert chart[0][0] == 10
    assert chart[0][1] == 20.0
    assert chart[1][0] == 20
    assert chart[1][1] == 15.0
