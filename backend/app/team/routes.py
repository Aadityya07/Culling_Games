from app.services.coordinator_assignment_service import assign_coordinator_to_team
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.middleware.role_required import role_required
from app.models import Team, TeamMember, User, Notification, TeamPower, Query
from app.extensions import db

team_bp = Blueprint("team", __name__, url_prefix="/api/team")


@team_bp.route("/create", methods=["POST"])
@role_required("TEAM")
def create_team():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    team_name = data.get("team_name")
    members = data.get("members")

    # Validate input
    if not team_name or not members:
        return jsonify({"error": "Team name and members required"}), 400

    # Must be between 2 and 4 members (leader + 2-4 = 3-5 total)
    if len(members) < 2 or len(members) > 4:
        return jsonify({"error": "Team must have between 3 to 5 members total including the leader."}), 400
    

    # Check if leader already has a team
    existing_team = Team.query.filter_by(leader_id=user_id).first()
    if existing_team:
        return jsonify({"error": "You have already created a team"}), 400

    # 🔥 REMOVED THE UNIQUE TEAM NAME CHECK HERE 🔥

    # 🔥 ADDED DYNAMIC ID LOGIC 🔥
    # Get the last created team to figure out the next ID
    last_team = Team.query.order_by(Team.id.desc()).first()
    next_id = last_team.id + 1 if last_team and last_team.id >= 101 else 101

    # Create team with the new dynamic ID
    new_team = Team(
        id=next_id,
        team_name=team_name,
        leader_id=user_id
    )

    db.session.add(new_team)
    db.session.flush()  # Get team ID before commit

    # Add team members
    for member in members:
        name = member.get("name")
        email = member.get("email")

        if not name or not email:
            return jsonify({"error": "Each member must have name and email"}), 400

        team_member = TeamMember(
            team_id=new_team.id,
            member_name=name,
            member_email=email
        )

        db.session.add(team_member)

    db.session.commit()

    # Assign coordinator automatically
    assign_coordinator_to_team(new_team.id)

    return jsonify({"message": "Team created successfully"}), 201



@team_bp.route("/me", methods=["GET"])
@role_required("TEAM")
def get_my_team():
    user_id = int(get_jwt_identity())
    team = Team.query.filter_by(leader_id=user_id).first()

    if not team:
        return jsonify({"error": "No team found for this leader"}), 404

    leader = User.query.get(team.leader_id)
    members = TeamMember.query.filter_by(team_id=team.id).all()

    members_list = [
        {
            "name": member.member_name,
            "email": member.member_email,
            "academic_year": getattr(member, 'academic_year', ''),
            "department": getattr(member, 'department', '')
        }
        for member in members
    ]

    return jsonify({
        "team_id": team.id,
        "team_name": team.team_name,
        "leader": {
            "name": leader.name,
            "email": leader.email,
            "phone": getattr(leader, 'phone', ''),
            "academic_year": getattr(leader, 'academic_year', ''),
            "department": getattr(leader, 'department', '')
        },
        "total_points": team.total_points,
        "weekly_points": team.weekly_points,
        "week_number": team.week_number,
        "weekly_cap_reached": team.weekly_cap_reached,
        "is_disqualified": team.is_disqualified,
        "members": members_list
    }), 200



@team_bp.route("/dashboard", methods=["GET"])
@role_required("TEAM")
def team_dashboard():
    user_id = int(get_jwt_identity())
    
    # Get the team where user is leader
    team = Team.query.filter_by(leader_id=user_id).first()
    
    if not team:
        return jsonify({"error": "No team found for this leader"}), 404
    
    # Get team members
    members = TeamMember.query.filter_by(team_id=team.id).all()
    
    members_list = [
        {
            "id": member.id,
            "name": member.member_name,
            "email": member.member_email,
            "joined_at": member.created_at.isoformat() if hasattr(member, 'created_at') else None
        }
        for member in members
    ]
    
    # Get recent activity or statistics (you can customize this based on your needs)
    dashboard_data = {
        "team_info": {
            "team_name": team.team_name,
            "team_id": team.id,
            "leader_id": team.leader_id,
            "total_points": team.total_points,
            "weekly_points": team.weekly_points,
            "week_number": team.week_number,
            "weekly_cap_reached": team.weekly_cap_reached,
            "is_disqualified": team.is_disqualified,
            "created_at": team.created_at.isoformat() if hasattr(team, 'created_at') else None
        },
        "members": members_list,
        "member_count": len(members_list),
        "stats": {
            "total_members": len(members_list),
            "completion_rate": calculate_completion_rate(team.id),  # You'll need to implement this
            "rank": get_team_rank(team.id)  # You'll need to implement this
        },
        "recent_activities": get_recent_activities(team.id)  # You'll need to implement this
    }
    
    return jsonify(dashboard_data), 200


@team_bp.route("/full-dashboard", methods=["GET"])
@role_required("TEAM")
def full_dashboard():

    user_id = int(get_jwt_identity())

    team = Team.query.filter_by(
        leader_id=user_id
    ).first()

    notifications = Notification.query.filter_by(
        is_active=True
    ).all()

    powers = TeamPower.query.filter_by(
        team_id=team.id
    ).all()

    queries = Query.query.filter_by(
        team_id=team.id
    ).all()

    return jsonify({

        "team": {
            "team_name": team.team_name,
            "total_points": team.total_points,
            "weekly_points": team.weekly_points,
            "week_number": team.week_number
        },

        "notifications": [
            {
                "title": n.title,
                "message": n.message
            } for n in notifications
        ],

        "powers": [
            {
                "type": p.power_type,
                "value": p.power_value,
                "active": p.is_active
            } for p in powers
        ],

        "queries": [
            {
                "question": q.question,
                "response": q.response
            } for q in queries
        ]

    }), 200


# 🔹 PUBLIC — Leaderboard
@team_bp.route("/leaderboard", methods=["GET"])
def leaderboard():
    from app.models import GameState, WeekConfig, User
    
    teams = Team.query.filter_by(is_disqualified=False)\
        .order_by(Team.total_points.desc()).all()

    # Get current week and weekly cap
    state = GameState.query.first()
    current_week = state.current_week if state else 1
    
    week_config = WeekConfig.query.filter_by(week_number=current_week).first()
    weekly_cap = week_config.weekly_cap if week_config else 30

    result = []
    rank = 1

    for team in teams:
        leader = User.query.get(team.leader_id)
        
        result.append({
            "rank": rank,
            "team_id": team.id,
            "team_name": team.team_name,
            "leader_email": leader.email if leader else "Unknown",
            "total_points": team.total_points,
            "weekly_points": team.weekly_points,
            "weekly_cap": weekly_cap
        })
        rank += 1

    return jsonify(result), 200


# Helper functions (you may need to implement these based on your models)
def calculate_completion_rate(team_id):
    # Implement logic to calculate task/challenge completion rate
    # This is a placeholder
    return 0.0


def get_team_rank(team_id):
    # Get team's rank in leaderboard
    team = Team.query.get(team_id)
    if not team:
        return None
    
    higher_ranked = Team.query.filter(
        Team.is_disqualified == False,
        Team.total_points > team.total_points
    ).count()
    
    return higher_ranked + 1


def get_recent_activities(team_id):
    # Implement logic to get recent team activities
    # This is a placeholder
    return []