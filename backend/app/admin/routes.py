import csv
import io
from datetime import datetime
from sqlalchemy import text
from app.auth.utils import hash_password
from app.models import TeamPower
from app.models import Submission, Task
from app.models import User, TeamMember
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.middleware.role_required import role_required
from app.models import Team, PointAdjustment, WeekConfig
from app.extensions import db

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


# 🔹 MASTER — Manual Point Adjustment
@admin_bp.route("/adjust-points", methods=["POST"])
@role_required("MASTER")
def adjust_points():

    data = request.get_json()

    team_id = data.get("team_id")
    points = data.get("points")
    reason = data.get("reason")
    proof_url = data.get("proof_url")  # ✅ FIXED POSITION

    if team_id is None or points is None or not reason:
        return jsonify({
            "error": "team_id, points, and reason are required"
        }), 400

    team = Team.query.get(team_id)

    if not team:
        return jsonify({"error": "Team not found"}), 404

    master_id = int(get_jwt_identity())

    week_config = WeekConfig.query.filter_by(
        week_number=team.week_number
    ).first()

    weekly_cap = week_config.weekly_cap if week_config else 30

    # enforce weekly cap
    if points > 0:

        remaining = weekly_cap - team.weekly_points

        if remaining <= 0:

            points = 0
            team.weekly_cap_reached = True

        elif points > remaining:

            points = remaining
            team.weekly_cap_reached = True

    team.weekly_points += points
    team.total_points += points

    # ✅ THIS is where proof_url must be included
    adjustment = PointAdjustment(

        team_id=team.id,

        points_changed=points,

        reason=reason,

        adjusted_by=master_id,

        week_number=team.week_number,

        proof_url=proof_url   # ✅ FIXED HERE

    )

    db.session.add(adjustment)

    db.session.commit()

    return jsonify({

        "message": "Points adjusted successfully",

        "points_changed": points,

        "team_total_points": team.total_points,

        "team_weekly_points": team.weekly_points,

        "proof_url": proof_url

    }), 200




# 🔹 MASTER — Disqualify Team
@admin_bp.route("/disqualify-team", methods=["POST"])
@role_required("MASTER")
def disqualify_team():

    data = request.get_json()

    team_id = data.get("team_id")
    reason = data.get("reason")

    if not team_id or not reason:
        return jsonify({"error": "team_id and reason required"}), 400

    team = Team.query.get(team_id)

    if not team:
        return jsonify({"error": "Team not found"}), 404

    team.is_disqualified = True

    db.session.commit()

    return jsonify({
        "message": f"Team {team.team_name} disqualified successfully"
    }), 200



# 🔹 MASTER + COORDINATOR — Dashboard overview
@admin_bp.route("/dashboard", methods=["GET"])
@role_required("MASTER", "COORDINATOR")
def admin_dashboard():

    total_teams = Team.query.count()

    total_coordinators = User.query.filter_by(
        role="COORDINATOR"
    ).count()

    total_masters = User.query.filter_by(
        role="MASTER"
    ).count()

    total_players = User.query.filter_by(
        role="TEAM"
    ).count()

    return jsonify({
        "total_teams": total_teams,
        "total_coordinators": total_coordinators,
        "total_masters": total_masters,
        "total_players": total_players
    }), 200




# 🔹 MASTER + COORDINATOR — View all teams
@admin_bp.route("/teams", methods=["GET"])
@role_required("MASTER", "COORDINATOR")
def get_all_teams():

    teams = Team.query.all()

    result = []

    for team in teams:

        leader = User.query.get(team.leader_id)

        coordinator = None

        if team.coordinator_id:
            coordinator = User.query.get(team.coordinator_id)

        result.append({

            "team_id": team.id,

            "team_name": team.team_name,

            "leader": {
                "leader_id": leader.id,
                "leader_name": leader.name,
                "leader_email": leader.email
            },

            "coordinator": {
                "coordinator_id": coordinator.id,
                "coordinator_name": coordinator.name,
                "coordinator_email": coordinator.email
            } if coordinator else None,

            "total_points": team.total_points,

            "weekly_points": team.weekly_points,

            "week_number": team.week_number,

            "is_disqualified": team.is_disqualified
        })

    return jsonify(result), 200




# 🔹 MASTER + COORDINATOR — View full team detail
@admin_bp.route("/team/<int:team_id>", methods=["GET"])
@role_required("MASTER", "COORDINATOR")
def get_team_detail(team_id):
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    leader = User.query.get(team.leader_id)
    coordinator = None
    if team.coordinator_id:
        coordinator = User.query.get(team.coordinator_id)

    members = TeamMember.query.filter_by(team_id=team.id).all()
    members_list = []
    for m in members:
        members_list.append({
            "name": m.member_name,
            "email": m.member_email,
            "academic_year": getattr(m, 'academic_year', ''),
            "department": getattr(m, 'department', '')
        })

    return jsonify({
        "team_id": team.id,
        "team_name": team.team_name,
        "leader": {
            "name": leader.name if leader else "Unknown",
            "email": leader.email if leader else "Unknown",
            "phone": getattr(leader, 'phone', ''),
            "academic_year": getattr(leader, 'academic_year', ''),
            "department": getattr(leader, 'department', '')
        },
        "coordinator": {
            "name": coordinator.name,
            "email": coordinator.email
        } if coordinator else None,
        "members": members_list,
        "total_points": team.total_points,
        "weekly_points": team.weekly_points,
        "week_number": team.week_number,
        "is_disqualified": team.is_disqualified
    }), 200



# 🔹 MASTER — Requalify team
@admin_bp.route("/requalify-team", methods=["POST"])
@role_required("MASTER")
def requalify_team():

    data = request.get_json()

    team_id = data.get("team_id")

    if not team_id:
        return jsonify({"error": "team_id required"}), 400

    team = Team.query.get(team_id)

    if not team:
        return jsonify({"error": "Team not found"}), 404

    team.is_disqualified = False

    db.session.commit()

    return jsonify({
        "message": f"Team {team.team_name} requalified successfully"
    }), 200



# 🔹 COORDINATOR — Dashboard (only assigned teams)
@admin_bp.route("/coordinator-dashboard", methods=["GET"])
@role_required("COORDINATOR")
def coordinator_dashboard():

    coordinator_id = int(get_jwt_identity())

    teams = Team.query.filter_by(
        coordinator_id=coordinator_id
    ).all()

    result = []

    for team in teams:

        leader = User.query.get(team.leader_id)

        members = TeamMember.query.filter_by(
            team_id=team.id
        ).all()

        members_list = []

        for m in members:
            members_list.append({
                "name": m.member_name,
                "email": m.member_email
            })

        result.append({

            "team_id": team.id,

            "team_name": team.team_name,

            "leader": {
                "name": leader.name,
                "email": leader.email
            },

            "members": members_list,

            "total_points": team.total_points,

            "weekly_points": team.weekly_points,

            "week_number": team.week_number,

            "is_disqualified": team.is_disqualified

        })

    return jsonify(result), 200



# 🔹 COORDINATOR — View pending submissions of assigned teams
@admin_bp.route("/coordinator-pending-submissions", methods=["GET"])
@role_required("COORDINATOR")
def coordinator_pending_submissions():

    coordinator_id = int(get_jwt_identity())

    teams = Team.query.filter_by(
        coordinator_id=coordinator_id
    ).all()

    team_ids = [team.id for team in teams]

    submissions = Submission.query.filter(
        Submission.team_id.in_(team_ids),
        Submission.status == "PENDING"
    ).all()

    result = []

    for s in submissions:

        team = Team.query.get(s.team_id)

        task = Task.query.get(s.task_id)

        result.append({

            "submission_id": s.id,

            "team_name": team.team_name,

            "task_name": task.name,

            "proof_url": s.proof_url,

            "description": s.description,

            "created_at": s.created_at

        })

    return jsonify(result), 200




# 🔹 MASTER — Full platform dashboard
@admin_bp.route("/master-dashboard", methods=["GET"])
@role_required("MASTER")
def master_dashboard():

    total_teams = Team.query.count()

    total_coordinators = User.query.filter_by(
        role="COORDINATOR"
    ).count()

    total_masters = User.query.filter_by(
        role="MASTER"
    ).count()

    total_players = User.query.filter_by(
        role="TEAM"
    ).count()

    total_submissions = Submission.query.count()

    pending_submissions = Submission.query.filter_by(
        status="PENDING"
    ).count()

    active_powers = TeamPower.query.filter_by(
        is_active=True
    ).count()

    return jsonify({

        "total_teams": total_teams,

        "total_coordinators": total_coordinators,

        "total_masters": total_masters,

        "total_players": total_players,

        "total_submissions": total_submissions,

        "pending_submissions": pending_submissions,

        "active_powers": active_powers

    }), 200



# 🔹 MASTER — View coordinators and their teams
@admin_bp.route("/coordinators", methods=["GET"])
@role_required("MASTER")
def get_coordinators():

    coordinators = User.query.filter_by(
        role="COORDINATOR"
    ).all()

    result = []

    for coord in coordinators:

        teams = Team.query.filter_by(
            coordinator_id=coord.id
        ).all()

        team_list = []

        for team in teams:

            team_list.append({

                "team_id": team.id,
                "team_name": team.team_name,
                "total_points": team.total_points

            })

        result.append({

            "coordinator_id": coord.id,

            "name": coord.name,

            "email": coord.email,

            "assigned_teams": team_list

        })

    return jsonify(result), 200


# 🔹 MASTER — View pending power requests
@admin_bp.route("/pending-powers", methods=["GET"])
@role_required("MASTER")
def pending_powers():

    # 🔥 THE BULLETPROOF FIX: 
    # A true "Pending" power is inactive, has NEVER been used, and has NO value assigned yet.
    powers = TeamPower.query.filter_by(
        is_active=False,
        used_count=0,     # Ignores used Shields/Curses
        power_value=0     # Ensures Master hasn't approved it yet
    ).all()

    result = []

    for power in powers:
        team = Team.query.get(power.team_id)
        
        if team:
            result.append({
                "power_id": power.id,
                "team_name": team.team_name,
                "power_type": power.power_type,
                "week_number": power.week_number
            })

    return jsonify(result), 200


@admin_bp.route("/create-team", methods=["POST"])
@role_required("MASTER", "COORDINATOR")
def admin_create_team():

    data = request.get_json()

    team_name = data.get("team_name")
    leader_name = data.get("leader_name")
    leader_email = data.get("leader_email")
    leader_password = data.get("leader_password")
    members = data.get("members")

    if not team_name or not leader_name or not leader_email or not leader_password:
        return jsonify({
            "error": "team_name, leader_name, leader_email, leader_password required"
        }), 400

    # Check email exists
    existing_user = User.query.filter_by(email=leader_email).first()

    if existing_user:
        return jsonify({
            "error": "Leader email already exists"
        }), 400

    # 1. Create TEAM user (This is what you were missing!)
    leader = User(
        name=leader_name,
        email=leader_email,
        password_hash=hash_password(leader_password),
        role="TEAM",
        is_active=True
    )

    db.session.add(leader)
    db.session.flush()

    # 2. Create team with dynamic ID logic
    last_team = Team.query.order_by(Team.id.desc()).first()
    next_id = last_team.id + 1 if last_team and last_team.id >= 101 else 101

    team = Team(
        id=next_id,
        team_name=team_name,
        leader_id=leader.id
    )

    db.session.add(team)
    db.session.flush()

    # 3. Add members
    if members:
        for m in members:
            member = TeamMember(
                team_id=team.id,
                member_name=m.get("name"),
                member_email=m.get("email")
            )
            db.session.add(member)

    db.session.commit()

    # 4. Assign coordinator automatically
    from app.services.coordinator_assignment_service import assign_coordinator_to_team

    assign_coordinator_to_team(team.id)

    return jsonify({
        "message": "Team created successfully by admin",
        "leader_email": leader_email
    }), 201




# 🔹 MASTER — Change Team Password & Force Logout (Supports Multiple Unique Passwords)
@admin_bp.route("/change-team-password", methods=["POST"])
@role_required("MASTER")
def change_team_password():
    # 🔥 SECURITY LOCK: Verify the requester is actually the Super Admin
    requester_id = int(get_jwt_identity())
    requester = User.query.get(requester_id)
    if not requester or requester.email != "uzumakiaditya433@gmail.com":
        return jsonify({"error": "ACCESS DENIED: Super Admin privileges required."}), 403

    data = request.get_json()
    updates = data.get("updates", [])

    if not updates:
        return jsonify({"error": "No updates provided."}), 400

    from app.models import ActiveSession
    
    updated_teams = []
    errors = []

    for update in updates:
        tid_raw = update.get("team_id")
        new_password = update.get("new_password")
        
        if not tid_raw or not new_password:
            continue
            
        try:
            tid = int(str(tid_raw).strip())
        except ValueError:
            errors.append(f"Invalid ID: {tid_raw}")
            continue

        team = Team.query.get(tid)
        if not team:
            errors.append(f"#{tid} not found")
            continue
        
        leader = User.query.get(team.leader_id)
        if not leader:
            errors.append(f"Leader for #{tid} not found")
            continue
        
        # 1. Securely Hash & Update the new password
        leader.password_hash = hash_password(new_password)
        
        # 2. Force Logout: Destroy all active sessions for this team's leader
        ActiveSession.query.filter_by(user_id=leader.id).delete()
        updated_teams.append(str(tid))

    db.session.commit()

    if not updated_teams:
        return jsonify({"error": f"No teams updated. Errors: {', '.join(errors)}"}), 400

    msg = f"Passwords successfully changed for Teams: {', '.join(updated_teams)}. Active sessions terminated."
    if errors:
        msg += f" (Failed rows: {', '.join(errors)})"

    return jsonify({"message": msg}), 200



# 🔹 MASTER (Super Admin) — Bulk Register Teams via CSV
@admin_bp.route("/bulk-register", methods=["POST"])
@role_required("MASTER")
def bulk_register_teams():
    requester_id = int(get_jwt_identity())
    requester = User.query.get(requester_id)
    if not requester or requester.email != "uzumakiaditya433@gmail.com":
        return jsonify({"error": "ACCESS DENIED: Super Admin privileges required."}), 403

    if 'file' not in request.files:
        return jsonify({"error": "No CSV file uploaded"}), 400
        
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({"error": "Only CSV files are allowed. Make sure you downloaded the Google Sheet as '.csv'"}), 400

    # ✅ FIX: Safely read and decode the file, handling Excel's weird encodings
    file_bytes = file.stream.read()
    
    try:
        # Try standard UTF-8 (Google Sheets default)
        file_content = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            # Fallback for Microsoft Excel default CSV encoding
            file_content = file_bytes.decode("latin-1")
        except Exception:
            return jsonify({"error": "Invalid file encoding. Please ensure it is a valid CSV."}), 400
            
    # ✅ FIX: Prevent crashes if someone just renamed an .xlsx to .csv
    if '\0' in file_content:
        return jsonify({"error": "This looks like an Excel file renamed to .csv. Please open it in Excel/Sheets and click 'File -> Download -> CSV'."}), 400

    stream = io.StringIO(file_content, newline=None)
    csv_reader = csv.reader(stream)
    next(csv_reader, None) # Skip header row safely
    
    teams_created = 0
    errors = []

    for row_num, row in enumerate(csv_reader, start=2):
        if not row or not row[0].strip():
            continue 

        try:
            team_name = row[0].strip()
            leader_name = row[2].strip()
            leader_email = row[3].strip()
            leader_phone = row[4].strip()
            leader_year = row[5].strip()
            leader_dept = row[6].strip()

            existing_user = User.query.filter_by(email=leader_email).first()
            if existing_user:
                errors.append(f"Row {row_num}: Email {leader_email} already exists. Skipped.")
                continue

            password = "123456"
            
            leader = User(
                name=leader_name,
                email=leader_email,
                phone=leader_phone,
                academic_year=leader_year,
                department=leader_dept,
                password_hash=hash_password(password),
                role="TEAM"
            )
            db.session.add(leader)
            db.session.flush()

            last_team = Team.query.order_by(Team.id.desc()).first()
            next_id = last_team.id + 1 if last_team and last_team.id >= 101 else 101
            
            team = Team(id=next_id, team_name=team_name, leader_id=leader.id)
            db.session.add(team)
            db.session.flush()

            member_ranges = [(7,10), (11,14), (15,18), (19,22)]
            for start_idx, end_idx in member_ranges:
                if len(row) > start_idx and row[start_idx].strip():
                    m_name = row[start_idx].strip()
                    m_email = row[start_idx+1].strip() if len(row) > start_idx+1 else ""
                    m_year = row[start_idx+2].strip() if len(row) > start_idx+2 else ""
                    m_dept = row[start_idx+3].strip() if len(row) > start_idx+3 else ""
                    
                    if m_name and m_email:
                        member = TeamMember(
                            team_id=team.id,
                            member_name=m_name,
                            member_email=m_email,
                            academic_year=m_year,
                            department=m_dept
                        )
                        db.session.add(member)

            db.session.commit()
            
            from app.services.coordinator_assignment_service import assign_coordinator_to_team
            assign_coordinator_to_team(team.id)
            
            teams_created += 1

        except Exception as e:
            db.session.rollback()
            errors.append(f"Row {row_num} Failed: {str(e)}")

    return jsonify({
        "message": f"Successfully registered {teams_created} teams from CSV.",
        "errors": errors
    }), 200


# 🔹 MASTER (Super Admin) — Export Enriched System Data
@admin_bp.route("/export-data", methods=["GET"])
@role_required("MASTER")
def export_data():
    requester_id = int(get_jwt_identity())
    requester = User.query.get(requester_id)
    
    if not requester or requester.email != "uzumakiaditya433@gmail.com":
        return jsonify({"error": "ACCESS DENIED: Super Admin privileges required."}), 403

    teams = Team.query.all()
    export_data = []

    for team in teams:
        leader = User.query.get(team.leader_id)
        members = TeamMember.query.filter_by(team_id=team.id).all()
        
        export_data.append({
            "team_id": team.id,
            "team_name": team.team_name,
            "week_number": team.week_number,
            "total_points": team.total_points,
            "weekly_points": team.weekly_points,
            "is_disqualified": team.is_disqualified,
            "leader": {
                "name": leader.name if leader else "Unknown",
                "email": leader.email if leader else "Unknown",
                "phone": getattr(leader, 'phone', ''),
                "academic_year": getattr(leader, 'academic_year', ''),
                "department": getattr(leader, 'department', '')
            },
            "members": [{
                "name": m.member_name,
                "email": m.member_email,
                "academic_year": getattr(m, 'academic_year', ''),
                "department": getattr(m, 'department', '')
            } for m in members]
        })

    return jsonify({
        "export_date": datetime.utcnow().isoformat(),
        "total_teams": len(export_data),
        "teams": export_data
    }), 200