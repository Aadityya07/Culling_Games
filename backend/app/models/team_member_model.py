from app.extensions import db

class TeamMember(db.Model):
    __tablename__ = "team_members"

    id = db.Column(db.Integer, primary_key=True)

    team_id = db.Column(
        db.Integer,
        db.ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False
    )

    member_name = db.Column(db.String(100), nullable=False)
    member_email = db.Column(db.String(150), nullable=False)
    
    # NEW FIELDS FROM CSV
    academic_year = db.Column(db.String(20), nullable=True)
    department = db.Column(db.String(50), nullable=True)

    def __repr__(self):
        return f"<TeamMember {self.member_name}>"