from src.park_model import calculate_drag_loss
from src.physics import score_setup_efficiency, analyze_setup_safety
from src.models import BowSetup, ArrowSetup

class VirtualCoach:
    def __init__(self, bow: BowSetup, arrow: ArrowSetup):
        self.bow = bow
        self.arrow = arrow
        
    def analyze_session_performance(self, 
                                  short_score: float, short_dist: float, short_face: int,
                                  long_score: float, long_dist: float, long_face: int):
        """
        Full analysis pipeline:
        1. Check Equipment Safety
        2. Check Setup Efficiency for the context
        3. Calculate Drag/Skill Loss
        """
        
        # 1. Safety
        safety_warnings = analyze_setup_safety(self.bow, self.arrow)
        
        # 2. Efficiency (Assume Outdoor context if long_dist > 30)
        discipline = 'outdoor' if long_dist > 30 else 'indoor'
        setup_analysis = score_setup_efficiency(self.bow, self.arrow, discipline)
        
        # 3. Park Model Analysis
        drag_analysis = calculate_drag_loss(
            short_score, short_dist, short_face,
            long_score, long_dist, long_face
        )
        
        # 4. Synthesis
        recommendations = []
        if drag_analysis['percent_loss'] > 10.0:
            recommendations.append("High Drag Loss detected (>10%).")
            if setup_analysis['gpp'] > 9.0:
                recommendations.append("-> Your arrow is heavy (High GPP). Consider lighter points for 50m.")
            if self.arrow.shaft_diameter_mm > 6.0:
                recommendations.append("-> Your arrow is thick. Wind drift is likely the cause.")
            if self.bow.tiller.type == 'positive':
                recommendations.append("-> Check Tiller. Barebow usually requires Neutral/Negative tiller.")
                
        return {
            "safety": safety_warnings,
            "setup_score": setup_analysis,
            "performance_metrics": drag_analysis,
            "coach_recommendations": recommendations
        }
