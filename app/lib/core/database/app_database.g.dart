// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $CoursesTable extends Courses with TableInfo<$CoursesTable, Course> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CoursesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _serverIdMeta =
      const VerificationMeta('serverId');
  @override
  late final GeneratedColumn<String> serverId = GeneratedColumn<String>(
      'server_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<int> syncStatus = GeneratedColumn<int>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _examTitleMeta =
      const VerificationMeta('examTitle');
  @override
  late final GeneratedColumn<String> examTitle = GeneratedColumn<String>(
      'exam_title', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _departmentMeta =
      const VerificationMeta('department');
  @override
  late final GeneratedColumn<String> department = GeneratedColumn<String>(
      'department', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('active'));
  static const VerificationMeta _totalStudentsMeta =
      const VerificationMeta('totalStudents');
  @override
  late final GeneratedColumn<int> totalStudents = GeneratedColumn<int>(
      'total_students', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _gradedCountMeta =
      const VerificationMeta('gradedCount');
  @override
  late final GeneratedColumn<int> gradedCount = GeneratedColumn<int>(
      'graded_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _questionPaperPathMeta =
      const VerificationMeta('questionPaperPath');
  @override
  late final GeneratedColumn<String> questionPaperPath =
      GeneratedColumn<String>('question_paper_path', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _answerKeyPathMeta =
      const VerificationMeta('answerKeyPath');
  @override
  late final GeneratedColumn<String> answerKeyPath = GeneratedColumn<String>(
      'answer_key_path', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _questionPaperTypeMeta =
      const VerificationMeta('questionPaperType');
  @override
  late final GeneratedColumn<String> questionPaperType =
      GeneratedColumn<String>('question_paper_type', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _answerKeyTypeMeta =
      const VerificationMeta('answerKeyType');
  @override
  late final GeneratedColumn<String> answerKeyType = GeneratedColumn<String>(
      'answer_key_type', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        serverId,
        syncStatus,
        name,
        examTitle,
        department,
        status,
        totalStudents,
        gradedCount,
        questionPaperPath,
        answerKeyPath,
        questionPaperType,
        answerKeyType,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'courses';
  @override
  VerificationContext validateIntegrity(Insertable<Course> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('server_id')) {
      context.handle(_serverIdMeta,
          serverId.isAcceptableOrUnknown(data['server_id']!, _serverIdMeta));
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('exam_title')) {
      context.handle(_examTitleMeta,
          examTitle.isAcceptableOrUnknown(data['exam_title']!, _examTitleMeta));
    } else if (isInserting) {
      context.missing(_examTitleMeta);
    }
    if (data.containsKey('department')) {
      context.handle(
          _departmentMeta,
          department.isAcceptableOrUnknown(
              data['department']!, _departmentMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('total_students')) {
      context.handle(
          _totalStudentsMeta,
          totalStudents.isAcceptableOrUnknown(
              data['total_students']!, _totalStudentsMeta));
    }
    if (data.containsKey('graded_count')) {
      context.handle(
          _gradedCountMeta,
          gradedCount.isAcceptableOrUnknown(
              data['graded_count']!, _gradedCountMeta));
    }
    if (data.containsKey('question_paper_path')) {
      context.handle(
          _questionPaperPathMeta,
          questionPaperPath.isAcceptableOrUnknown(
              data['question_paper_path']!, _questionPaperPathMeta));
    }
    if (data.containsKey('answer_key_path')) {
      context.handle(
          _answerKeyPathMeta,
          answerKeyPath.isAcceptableOrUnknown(
              data['answer_key_path']!, _answerKeyPathMeta));
    }
    if (data.containsKey('question_paper_type')) {
      context.handle(
          _questionPaperTypeMeta,
          questionPaperType.isAcceptableOrUnknown(
              data['question_paper_type']!, _questionPaperTypeMeta));
    }
    if (data.containsKey('answer_key_type')) {
      context.handle(
          _answerKeyTypeMeta,
          answerKeyType.isAcceptableOrUnknown(
              data['answer_key_type']!, _answerKeyTypeMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Course map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Course(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      serverId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}server_id']),
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      examTitle: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}exam_title'])!,
      department: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}department']),
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      totalStudents: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}total_students'])!,
      gradedCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}graded_count'])!,
      questionPaperPath: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}question_paper_path']),
      answerKeyPath: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}answer_key_path']),
      questionPaperType: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}question_paper_type']),
      answerKeyType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}answer_key_type']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $CoursesTable createAlias(String alias) {
    return $CoursesTable(attachedDatabase, alias);
  }
}

class Course extends DataClass implements Insertable<Course> {
  /// Client-generated UUID primary key (allows offline creation).
  final String id;

  /// Server-assigned ID after sync. Null means created offline, not yet synced.
  final String? serverId;

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  final int syncStatus;

  /// Course name (e.g., "CS101").
  final String name;

  /// Exam title (e.g., "Midterm").
  final String examTitle;

  /// Department name, optional.
  final String? department;

  /// Course status: active, processing, completed, stopped.
  final String status;

  /// Total number of students enrolled.
  final int totalStudents;

  /// Number of students graded so far.
  final int gradedCount;

  /// Local path to the question paper file (scan or uploaded).
  final String? questionPaperPath;

  /// Local path to the answer key file (scan or uploaded).
  final String? answerKeyPath;

  /// How the question paper was provided: "scan" or "upload".
  final String? questionPaperType;

  /// How the answer key was provided: "scan" or "upload".
  final String? answerKeyType;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;
  const Course(
      {required this.id,
      this.serverId,
      required this.syncStatus,
      required this.name,
      required this.examTitle,
      this.department,
      required this.status,
      required this.totalStudents,
      required this.gradedCount,
      this.questionPaperPath,
      this.answerKeyPath,
      this.questionPaperType,
      this.answerKeyType,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || serverId != null) {
      map['server_id'] = Variable<String>(serverId);
    }
    map['sync_status'] = Variable<int>(syncStatus);
    map['name'] = Variable<String>(name);
    map['exam_title'] = Variable<String>(examTitle);
    if (!nullToAbsent || department != null) {
      map['department'] = Variable<String>(department);
    }
    map['status'] = Variable<String>(status);
    map['total_students'] = Variable<int>(totalStudents);
    map['graded_count'] = Variable<int>(gradedCount);
    if (!nullToAbsent || questionPaperPath != null) {
      map['question_paper_path'] = Variable<String>(questionPaperPath);
    }
    if (!nullToAbsent || answerKeyPath != null) {
      map['answer_key_path'] = Variable<String>(answerKeyPath);
    }
    if (!nullToAbsent || questionPaperType != null) {
      map['question_paper_type'] = Variable<String>(questionPaperType);
    }
    if (!nullToAbsent || answerKeyType != null) {
      map['answer_key_type'] = Variable<String>(answerKeyType);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  CoursesCompanion toCompanion(bool nullToAbsent) {
    return CoursesCompanion(
      id: Value(id),
      serverId: serverId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverId),
      syncStatus: Value(syncStatus),
      name: Value(name),
      examTitle: Value(examTitle),
      department: department == null && nullToAbsent
          ? const Value.absent()
          : Value(department),
      status: Value(status),
      totalStudents: Value(totalStudents),
      gradedCount: Value(gradedCount),
      questionPaperPath: questionPaperPath == null && nullToAbsent
          ? const Value.absent()
          : Value(questionPaperPath),
      answerKeyPath: answerKeyPath == null && nullToAbsent
          ? const Value.absent()
          : Value(answerKeyPath),
      questionPaperType: questionPaperType == null && nullToAbsent
          ? const Value.absent()
          : Value(questionPaperType),
      answerKeyType: answerKeyType == null && nullToAbsent
          ? const Value.absent()
          : Value(answerKeyType),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory Course.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Course(
      id: serializer.fromJson<String>(json['id']),
      serverId: serializer.fromJson<String?>(json['serverId']),
      syncStatus: serializer.fromJson<int>(json['syncStatus']),
      name: serializer.fromJson<String>(json['name']),
      examTitle: serializer.fromJson<String>(json['examTitle']),
      department: serializer.fromJson<String?>(json['department']),
      status: serializer.fromJson<String>(json['status']),
      totalStudents: serializer.fromJson<int>(json['totalStudents']),
      gradedCount: serializer.fromJson<int>(json['gradedCount']),
      questionPaperPath:
          serializer.fromJson<String?>(json['questionPaperPath']),
      answerKeyPath: serializer.fromJson<String?>(json['answerKeyPath']),
      questionPaperType:
          serializer.fromJson<String?>(json['questionPaperType']),
      answerKeyType: serializer.fromJson<String?>(json['answerKeyType']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'serverId': serializer.toJson<String?>(serverId),
      'syncStatus': serializer.toJson<int>(syncStatus),
      'name': serializer.toJson<String>(name),
      'examTitle': serializer.toJson<String>(examTitle),
      'department': serializer.toJson<String?>(department),
      'status': serializer.toJson<String>(status),
      'totalStudents': serializer.toJson<int>(totalStudents),
      'gradedCount': serializer.toJson<int>(gradedCount),
      'questionPaperPath': serializer.toJson<String?>(questionPaperPath),
      'answerKeyPath': serializer.toJson<String?>(answerKeyPath),
      'questionPaperType': serializer.toJson<String?>(questionPaperType),
      'answerKeyType': serializer.toJson<String?>(answerKeyType),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  Course copyWith(
          {String? id,
          Value<String?> serverId = const Value.absent(),
          int? syncStatus,
          String? name,
          String? examTitle,
          Value<String?> department = const Value.absent(),
          String? status,
          int? totalStudents,
          int? gradedCount,
          Value<String?> questionPaperPath = const Value.absent(),
          Value<String?> answerKeyPath = const Value.absent(),
          Value<String?> questionPaperType = const Value.absent(),
          Value<String?> answerKeyType = const Value.absent(),
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      Course(
        id: id ?? this.id,
        serverId: serverId.present ? serverId.value : this.serverId,
        syncStatus: syncStatus ?? this.syncStatus,
        name: name ?? this.name,
        examTitle: examTitle ?? this.examTitle,
        department: department.present ? department.value : this.department,
        status: status ?? this.status,
        totalStudents: totalStudents ?? this.totalStudents,
        gradedCount: gradedCount ?? this.gradedCount,
        questionPaperPath: questionPaperPath.present
            ? questionPaperPath.value
            : this.questionPaperPath,
        answerKeyPath:
            answerKeyPath.present ? answerKeyPath.value : this.answerKeyPath,
        questionPaperType: questionPaperType.present
            ? questionPaperType.value
            : this.questionPaperType,
        answerKeyType:
            answerKeyType.present ? answerKeyType.value : this.answerKeyType,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  Course copyWithCompanion(CoursesCompanion data) {
    return Course(
      id: data.id.present ? data.id.value : this.id,
      serverId: data.serverId.present ? data.serverId.value : this.serverId,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      name: data.name.present ? data.name.value : this.name,
      examTitle: data.examTitle.present ? data.examTitle.value : this.examTitle,
      department:
          data.department.present ? data.department.value : this.department,
      status: data.status.present ? data.status.value : this.status,
      totalStudents: data.totalStudents.present
          ? data.totalStudents.value
          : this.totalStudents,
      gradedCount:
          data.gradedCount.present ? data.gradedCount.value : this.gradedCount,
      questionPaperPath: data.questionPaperPath.present
          ? data.questionPaperPath.value
          : this.questionPaperPath,
      answerKeyPath: data.answerKeyPath.present
          ? data.answerKeyPath.value
          : this.answerKeyPath,
      questionPaperType: data.questionPaperType.present
          ? data.questionPaperType.value
          : this.questionPaperType,
      answerKeyType: data.answerKeyType.present
          ? data.answerKeyType.value
          : this.answerKeyType,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Course(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('name: $name, ')
          ..write('examTitle: $examTitle, ')
          ..write('department: $department, ')
          ..write('status: $status, ')
          ..write('totalStudents: $totalStudents, ')
          ..write('gradedCount: $gradedCount, ')
          ..write('questionPaperPath: $questionPaperPath, ')
          ..write('answerKeyPath: $answerKeyPath, ')
          ..write('questionPaperType: $questionPaperType, ')
          ..write('answerKeyType: $answerKeyType, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      serverId,
      syncStatus,
      name,
      examTitle,
      department,
      status,
      totalStudents,
      gradedCount,
      questionPaperPath,
      answerKeyPath,
      questionPaperType,
      answerKeyType,
      createdAt,
      updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Course &&
          other.id == this.id &&
          other.serverId == this.serverId &&
          other.syncStatus == this.syncStatus &&
          other.name == this.name &&
          other.examTitle == this.examTitle &&
          other.department == this.department &&
          other.status == this.status &&
          other.totalStudents == this.totalStudents &&
          other.gradedCount == this.gradedCount &&
          other.questionPaperPath == this.questionPaperPath &&
          other.answerKeyPath == this.answerKeyPath &&
          other.questionPaperType == this.questionPaperType &&
          other.answerKeyType == this.answerKeyType &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class CoursesCompanion extends UpdateCompanion<Course> {
  final Value<String> id;
  final Value<String?> serverId;
  final Value<int> syncStatus;
  final Value<String> name;
  final Value<String> examTitle;
  final Value<String?> department;
  final Value<String> status;
  final Value<int> totalStudents;
  final Value<int> gradedCount;
  final Value<String?> questionPaperPath;
  final Value<String?> answerKeyPath;
  final Value<String?> questionPaperType;
  final Value<String?> answerKeyType;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const CoursesCompanion({
    this.id = const Value.absent(),
    this.serverId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.name = const Value.absent(),
    this.examTitle = const Value.absent(),
    this.department = const Value.absent(),
    this.status = const Value.absent(),
    this.totalStudents = const Value.absent(),
    this.gradedCount = const Value.absent(),
    this.questionPaperPath = const Value.absent(),
    this.answerKeyPath = const Value.absent(),
    this.questionPaperType = const Value.absent(),
    this.answerKeyType = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CoursesCompanion.insert({
    required String id,
    this.serverId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    required String name,
    required String examTitle,
    this.department = const Value.absent(),
    this.status = const Value.absent(),
    this.totalStudents = const Value.absent(),
    this.gradedCount = const Value.absent(),
    this.questionPaperPath = const Value.absent(),
    this.answerKeyPath = const Value.absent(),
    this.questionPaperType = const Value.absent(),
    this.answerKeyType = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        name = Value(name),
        examTitle = Value(examTitle);
  static Insertable<Course> custom({
    Expression<String>? id,
    Expression<String>? serverId,
    Expression<int>? syncStatus,
    Expression<String>? name,
    Expression<String>? examTitle,
    Expression<String>? department,
    Expression<String>? status,
    Expression<int>? totalStudents,
    Expression<int>? gradedCount,
    Expression<String>? questionPaperPath,
    Expression<String>? answerKeyPath,
    Expression<String>? questionPaperType,
    Expression<String>? answerKeyType,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (serverId != null) 'server_id': serverId,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (name != null) 'name': name,
      if (examTitle != null) 'exam_title': examTitle,
      if (department != null) 'department': department,
      if (status != null) 'status': status,
      if (totalStudents != null) 'total_students': totalStudents,
      if (gradedCount != null) 'graded_count': gradedCount,
      if (questionPaperPath != null) 'question_paper_path': questionPaperPath,
      if (answerKeyPath != null) 'answer_key_path': answerKeyPath,
      if (questionPaperType != null) 'question_paper_type': questionPaperType,
      if (answerKeyType != null) 'answer_key_type': answerKeyType,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CoursesCompanion copyWith(
      {Value<String>? id,
      Value<String?>? serverId,
      Value<int>? syncStatus,
      Value<String>? name,
      Value<String>? examTitle,
      Value<String?>? department,
      Value<String>? status,
      Value<int>? totalStudents,
      Value<int>? gradedCount,
      Value<String?>? questionPaperPath,
      Value<String?>? answerKeyPath,
      Value<String?>? questionPaperType,
      Value<String?>? answerKeyType,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return CoursesCompanion(
      id: id ?? this.id,
      serverId: serverId ?? this.serverId,
      syncStatus: syncStatus ?? this.syncStatus,
      name: name ?? this.name,
      examTitle: examTitle ?? this.examTitle,
      department: department ?? this.department,
      status: status ?? this.status,
      totalStudents: totalStudents ?? this.totalStudents,
      gradedCount: gradedCount ?? this.gradedCount,
      questionPaperPath: questionPaperPath ?? this.questionPaperPath,
      answerKeyPath: answerKeyPath ?? this.answerKeyPath,
      questionPaperType: questionPaperType ?? this.questionPaperType,
      answerKeyType: answerKeyType ?? this.answerKeyType,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (serverId.present) {
      map['server_id'] = Variable<String>(serverId.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(syncStatus.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (examTitle.present) {
      map['exam_title'] = Variable<String>(examTitle.value);
    }
    if (department.present) {
      map['department'] = Variable<String>(department.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (totalStudents.present) {
      map['total_students'] = Variable<int>(totalStudents.value);
    }
    if (gradedCount.present) {
      map['graded_count'] = Variable<int>(gradedCount.value);
    }
    if (questionPaperPath.present) {
      map['question_paper_path'] = Variable<String>(questionPaperPath.value);
    }
    if (answerKeyPath.present) {
      map['answer_key_path'] = Variable<String>(answerKeyPath.value);
    }
    if (questionPaperType.present) {
      map['question_paper_type'] = Variable<String>(questionPaperType.value);
    }
    if (answerKeyType.present) {
      map['answer_key_type'] = Variable<String>(answerKeyType.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CoursesCompanion(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('name: $name, ')
          ..write('examTitle: $examTitle, ')
          ..write('department: $department, ')
          ..write('status: $status, ')
          ..write('totalStudents: $totalStudents, ')
          ..write('gradedCount: $gradedCount, ')
          ..write('questionPaperPath: $questionPaperPath, ')
          ..write('answerKeyPath: $answerKeyPath, ')
          ..write('questionPaperType: $questionPaperType, ')
          ..write('answerKeyType: $answerKeyType, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ExamsTable extends Exams with TableInfo<$ExamsTable, Exam> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ExamsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _serverIdMeta =
      const VerificationMeta('serverId');
  @override
  late final GeneratedColumn<String> serverId = GeneratedColumn<String>(
      'server_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<int> syncStatus = GeneratedColumn<int>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _courseIdMeta =
      const VerificationMeta('courseId');
  @override
  late final GeneratedColumn<String> courseId = GeneratedColumn<String>(
      'course_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
      'title', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _totalMarksMeta =
      const VerificationMeta('totalMarks');
  @override
  late final GeneratedColumn<int> totalMarks = GeneratedColumn<int>(
      'total_marks', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(100));
  static const VerificationMeta _questionPaperPathMeta =
      const VerificationMeta('questionPaperPath');
  @override
  late final GeneratedColumn<String> questionPaperPath =
      GeneratedColumn<String>('question_paper_path', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _answerKeyPathMeta =
      const VerificationMeta('answerKeyPath');
  @override
  late final GeneratedColumn<String> answerKeyPath = GeneratedColumn<String>(
      'answer_key_path', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        serverId,
        syncStatus,
        courseId,
        title,
        totalMarks,
        questionPaperPath,
        answerKeyPath,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'exams';
  @override
  VerificationContext validateIntegrity(Insertable<Exam> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('server_id')) {
      context.handle(_serverIdMeta,
          serverId.isAcceptableOrUnknown(data['server_id']!, _serverIdMeta));
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('course_id')) {
      context.handle(_courseIdMeta,
          courseId.isAcceptableOrUnknown(data['course_id']!, _courseIdMeta));
    } else if (isInserting) {
      context.missing(_courseIdMeta);
    }
    if (data.containsKey('title')) {
      context.handle(
          _titleMeta, title.isAcceptableOrUnknown(data['title']!, _titleMeta));
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('total_marks')) {
      context.handle(
          _totalMarksMeta,
          totalMarks.isAcceptableOrUnknown(
              data['total_marks']!, _totalMarksMeta));
    }
    if (data.containsKey('question_paper_path')) {
      context.handle(
          _questionPaperPathMeta,
          questionPaperPath.isAcceptableOrUnknown(
              data['question_paper_path']!, _questionPaperPathMeta));
    }
    if (data.containsKey('answer_key_path')) {
      context.handle(
          _answerKeyPathMeta,
          answerKeyPath.isAcceptableOrUnknown(
              data['answer_key_path']!, _answerKeyPathMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Exam map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Exam(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      serverId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}server_id']),
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!,
      courseId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}course_id'])!,
      title: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}title'])!,
      totalMarks: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}total_marks'])!,
      questionPaperPath: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}question_paper_path']),
      answerKeyPath: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}answer_key_path']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $ExamsTable createAlias(String alias) {
    return $ExamsTable(attachedDatabase, alias);
  }
}

class Exam extends DataClass implements Insertable<Exam> {
  /// Client-generated UUID primary key.
  final String id;

  /// Server-assigned ID after sync. Null means created offline.
  final String? serverId;

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  final int syncStatus;

  /// Foreign key to courses table.
  final String courseId;

  /// Exam title.
  final String title;

  /// Total marks for the exam.
  final int totalMarks;

  /// Local file path for the question paper image/PDF.
  final String? questionPaperPath;

  /// Local file path for the answer key image/PDF.
  final String? answerKeyPath;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;
  const Exam(
      {required this.id,
      this.serverId,
      required this.syncStatus,
      required this.courseId,
      required this.title,
      required this.totalMarks,
      this.questionPaperPath,
      this.answerKeyPath,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || serverId != null) {
      map['server_id'] = Variable<String>(serverId);
    }
    map['sync_status'] = Variable<int>(syncStatus);
    map['course_id'] = Variable<String>(courseId);
    map['title'] = Variable<String>(title);
    map['total_marks'] = Variable<int>(totalMarks);
    if (!nullToAbsent || questionPaperPath != null) {
      map['question_paper_path'] = Variable<String>(questionPaperPath);
    }
    if (!nullToAbsent || answerKeyPath != null) {
      map['answer_key_path'] = Variable<String>(answerKeyPath);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  ExamsCompanion toCompanion(bool nullToAbsent) {
    return ExamsCompanion(
      id: Value(id),
      serverId: serverId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverId),
      syncStatus: Value(syncStatus),
      courseId: Value(courseId),
      title: Value(title),
      totalMarks: Value(totalMarks),
      questionPaperPath: questionPaperPath == null && nullToAbsent
          ? const Value.absent()
          : Value(questionPaperPath),
      answerKeyPath: answerKeyPath == null && nullToAbsent
          ? const Value.absent()
          : Value(answerKeyPath),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory Exam.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Exam(
      id: serializer.fromJson<String>(json['id']),
      serverId: serializer.fromJson<String?>(json['serverId']),
      syncStatus: serializer.fromJson<int>(json['syncStatus']),
      courseId: serializer.fromJson<String>(json['courseId']),
      title: serializer.fromJson<String>(json['title']),
      totalMarks: serializer.fromJson<int>(json['totalMarks']),
      questionPaperPath:
          serializer.fromJson<String?>(json['questionPaperPath']),
      answerKeyPath: serializer.fromJson<String?>(json['answerKeyPath']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'serverId': serializer.toJson<String?>(serverId),
      'syncStatus': serializer.toJson<int>(syncStatus),
      'courseId': serializer.toJson<String>(courseId),
      'title': serializer.toJson<String>(title),
      'totalMarks': serializer.toJson<int>(totalMarks),
      'questionPaperPath': serializer.toJson<String?>(questionPaperPath),
      'answerKeyPath': serializer.toJson<String?>(answerKeyPath),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  Exam copyWith(
          {String? id,
          Value<String?> serverId = const Value.absent(),
          int? syncStatus,
          String? courseId,
          String? title,
          int? totalMarks,
          Value<String?> questionPaperPath = const Value.absent(),
          Value<String?> answerKeyPath = const Value.absent(),
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      Exam(
        id: id ?? this.id,
        serverId: serverId.present ? serverId.value : this.serverId,
        syncStatus: syncStatus ?? this.syncStatus,
        courseId: courseId ?? this.courseId,
        title: title ?? this.title,
        totalMarks: totalMarks ?? this.totalMarks,
        questionPaperPath: questionPaperPath.present
            ? questionPaperPath.value
            : this.questionPaperPath,
        answerKeyPath:
            answerKeyPath.present ? answerKeyPath.value : this.answerKeyPath,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  Exam copyWithCompanion(ExamsCompanion data) {
    return Exam(
      id: data.id.present ? data.id.value : this.id,
      serverId: data.serverId.present ? data.serverId.value : this.serverId,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      courseId: data.courseId.present ? data.courseId.value : this.courseId,
      title: data.title.present ? data.title.value : this.title,
      totalMarks:
          data.totalMarks.present ? data.totalMarks.value : this.totalMarks,
      questionPaperPath: data.questionPaperPath.present
          ? data.questionPaperPath.value
          : this.questionPaperPath,
      answerKeyPath: data.answerKeyPath.present
          ? data.answerKeyPath.value
          : this.answerKeyPath,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Exam(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('courseId: $courseId, ')
          ..write('title: $title, ')
          ..write('totalMarks: $totalMarks, ')
          ..write('questionPaperPath: $questionPaperPath, ')
          ..write('answerKeyPath: $answerKeyPath, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, serverId, syncStatus, courseId, title,
      totalMarks, questionPaperPath, answerKeyPath, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Exam &&
          other.id == this.id &&
          other.serverId == this.serverId &&
          other.syncStatus == this.syncStatus &&
          other.courseId == this.courseId &&
          other.title == this.title &&
          other.totalMarks == this.totalMarks &&
          other.questionPaperPath == this.questionPaperPath &&
          other.answerKeyPath == this.answerKeyPath &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class ExamsCompanion extends UpdateCompanion<Exam> {
  final Value<String> id;
  final Value<String?> serverId;
  final Value<int> syncStatus;
  final Value<String> courseId;
  final Value<String> title;
  final Value<int> totalMarks;
  final Value<String?> questionPaperPath;
  final Value<String?> answerKeyPath;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const ExamsCompanion({
    this.id = const Value.absent(),
    this.serverId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.courseId = const Value.absent(),
    this.title = const Value.absent(),
    this.totalMarks = const Value.absent(),
    this.questionPaperPath = const Value.absent(),
    this.answerKeyPath = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ExamsCompanion.insert({
    required String id,
    this.serverId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    required String courseId,
    required String title,
    this.totalMarks = const Value.absent(),
    this.questionPaperPath = const Value.absent(),
    this.answerKeyPath = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        courseId = Value(courseId),
        title = Value(title);
  static Insertable<Exam> custom({
    Expression<String>? id,
    Expression<String>? serverId,
    Expression<int>? syncStatus,
    Expression<String>? courseId,
    Expression<String>? title,
    Expression<int>? totalMarks,
    Expression<String>? questionPaperPath,
    Expression<String>? answerKeyPath,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (serverId != null) 'server_id': serverId,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (courseId != null) 'course_id': courseId,
      if (title != null) 'title': title,
      if (totalMarks != null) 'total_marks': totalMarks,
      if (questionPaperPath != null) 'question_paper_path': questionPaperPath,
      if (answerKeyPath != null) 'answer_key_path': answerKeyPath,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ExamsCompanion copyWith(
      {Value<String>? id,
      Value<String?>? serverId,
      Value<int>? syncStatus,
      Value<String>? courseId,
      Value<String>? title,
      Value<int>? totalMarks,
      Value<String?>? questionPaperPath,
      Value<String?>? answerKeyPath,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return ExamsCompanion(
      id: id ?? this.id,
      serverId: serverId ?? this.serverId,
      syncStatus: syncStatus ?? this.syncStatus,
      courseId: courseId ?? this.courseId,
      title: title ?? this.title,
      totalMarks: totalMarks ?? this.totalMarks,
      questionPaperPath: questionPaperPath ?? this.questionPaperPath,
      answerKeyPath: answerKeyPath ?? this.answerKeyPath,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (serverId.present) {
      map['server_id'] = Variable<String>(serverId.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(syncStatus.value);
    }
    if (courseId.present) {
      map['course_id'] = Variable<String>(courseId.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (totalMarks.present) {
      map['total_marks'] = Variable<int>(totalMarks.value);
    }
    if (questionPaperPath.present) {
      map['question_paper_path'] = Variable<String>(questionPaperPath.value);
    }
    if (answerKeyPath.present) {
      map['answer_key_path'] = Variable<String>(answerKeyPath.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ExamsCompanion(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('courseId: $courseId, ')
          ..write('title: $title, ')
          ..write('totalMarks: $totalMarks, ')
          ..write('questionPaperPath: $questionPaperPath, ')
          ..write('answerKeyPath: $answerKeyPath, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $StudentsTable extends Students with TableInfo<$StudentsTable, Student> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $StudentsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _serverIdMeta =
      const VerificationMeta('serverId');
  @override
  late final GeneratedColumn<String> serverId = GeneratedColumn<String>(
      'server_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<int> syncStatus = GeneratedColumn<int>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _courseIdMeta =
      const VerificationMeta('courseId');
  @override
  late final GeneratedColumn<String> courseId = GeneratedColumn<String>(
      'course_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _rollNumberMeta =
      const VerificationMeta('rollNumber');
  @override
  late final GeneratedColumn<String> rollNumber = GeneratedColumn<String>(
      'roll_number', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _gradingStatusMeta =
      const VerificationMeta('gradingStatus');
  @override
  late final GeneratedColumn<String> gradingStatus = GeneratedColumn<String>(
      'grading_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _totalScoreMeta =
      const VerificationMeta('totalScore');
  @override
  late final GeneratedColumn<double> totalScore = GeneratedColumn<double>(
      'total_score', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _maxScoreMeta =
      const VerificationMeta('maxScore');
  @override
  late final GeneratedColumn<double> maxScore = GeneratedColumn<double>(
      'max_score', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        serverId,
        syncStatus,
        courseId,
        name,
        rollNumber,
        gradingStatus,
        totalScore,
        maxScore,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'students';
  @override
  VerificationContext validateIntegrity(Insertable<Student> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('server_id')) {
      context.handle(_serverIdMeta,
          serverId.isAcceptableOrUnknown(data['server_id']!, _serverIdMeta));
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('course_id')) {
      context.handle(_courseIdMeta,
          courseId.isAcceptableOrUnknown(data['course_id']!, _courseIdMeta));
    } else if (isInserting) {
      context.missing(_courseIdMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('roll_number')) {
      context.handle(
          _rollNumberMeta,
          rollNumber.isAcceptableOrUnknown(
              data['roll_number']!, _rollNumberMeta));
    } else if (isInserting) {
      context.missing(_rollNumberMeta);
    }
    if (data.containsKey('grading_status')) {
      context.handle(
          _gradingStatusMeta,
          gradingStatus.isAcceptableOrUnknown(
              data['grading_status']!, _gradingStatusMeta));
    }
    if (data.containsKey('total_score')) {
      context.handle(
          _totalScoreMeta,
          totalScore.isAcceptableOrUnknown(
              data['total_score']!, _totalScoreMeta));
    }
    if (data.containsKey('max_score')) {
      context.handle(_maxScoreMeta,
          maxScore.isAcceptableOrUnknown(data['max_score']!, _maxScoreMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Student map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Student(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      serverId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}server_id']),
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!,
      courseId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}course_id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      rollNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}roll_number'])!,
      gradingStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}grading_status'])!,
      totalScore: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}total_score']),
      maxScore: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}max_score']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $StudentsTable createAlias(String alias) {
    return $StudentsTable(attachedDatabase, alias);
  }
}

class Student extends DataClass implements Insertable<Student> {
  /// Client-generated UUID primary key.
  final String id;

  /// Server-assigned ID after sync. Null means created offline.
  final String? serverId;

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  final int syncStatus;

  /// Foreign key to courses table.
  final String courseId;

  /// Student's full name.
  final String name;

  /// Student's roll number / identifier.
  final String rollNumber;

  /// Grading status: pending, processing, graded.
  final String gradingStatus;

  /// Total score achieved. Null until graded.
  final double? totalScore;

  /// Maximum possible score. Null until graded.
  final double? maxScore;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;
  const Student(
      {required this.id,
      this.serverId,
      required this.syncStatus,
      required this.courseId,
      required this.name,
      required this.rollNumber,
      required this.gradingStatus,
      this.totalScore,
      this.maxScore,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || serverId != null) {
      map['server_id'] = Variable<String>(serverId);
    }
    map['sync_status'] = Variable<int>(syncStatus);
    map['course_id'] = Variable<String>(courseId);
    map['name'] = Variable<String>(name);
    map['roll_number'] = Variable<String>(rollNumber);
    map['grading_status'] = Variable<String>(gradingStatus);
    if (!nullToAbsent || totalScore != null) {
      map['total_score'] = Variable<double>(totalScore);
    }
    if (!nullToAbsent || maxScore != null) {
      map['max_score'] = Variable<double>(maxScore);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  StudentsCompanion toCompanion(bool nullToAbsent) {
    return StudentsCompanion(
      id: Value(id),
      serverId: serverId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverId),
      syncStatus: Value(syncStatus),
      courseId: Value(courseId),
      name: Value(name),
      rollNumber: Value(rollNumber),
      gradingStatus: Value(gradingStatus),
      totalScore: totalScore == null && nullToAbsent
          ? const Value.absent()
          : Value(totalScore),
      maxScore: maxScore == null && nullToAbsent
          ? const Value.absent()
          : Value(maxScore),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory Student.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Student(
      id: serializer.fromJson<String>(json['id']),
      serverId: serializer.fromJson<String?>(json['serverId']),
      syncStatus: serializer.fromJson<int>(json['syncStatus']),
      courseId: serializer.fromJson<String>(json['courseId']),
      name: serializer.fromJson<String>(json['name']),
      rollNumber: serializer.fromJson<String>(json['rollNumber']),
      gradingStatus: serializer.fromJson<String>(json['gradingStatus']),
      totalScore: serializer.fromJson<double?>(json['totalScore']),
      maxScore: serializer.fromJson<double?>(json['maxScore']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'serverId': serializer.toJson<String?>(serverId),
      'syncStatus': serializer.toJson<int>(syncStatus),
      'courseId': serializer.toJson<String>(courseId),
      'name': serializer.toJson<String>(name),
      'rollNumber': serializer.toJson<String>(rollNumber),
      'gradingStatus': serializer.toJson<String>(gradingStatus),
      'totalScore': serializer.toJson<double?>(totalScore),
      'maxScore': serializer.toJson<double?>(maxScore),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  Student copyWith(
          {String? id,
          Value<String?> serverId = const Value.absent(),
          int? syncStatus,
          String? courseId,
          String? name,
          String? rollNumber,
          String? gradingStatus,
          Value<double?> totalScore = const Value.absent(),
          Value<double?> maxScore = const Value.absent(),
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      Student(
        id: id ?? this.id,
        serverId: serverId.present ? serverId.value : this.serverId,
        syncStatus: syncStatus ?? this.syncStatus,
        courseId: courseId ?? this.courseId,
        name: name ?? this.name,
        rollNumber: rollNumber ?? this.rollNumber,
        gradingStatus: gradingStatus ?? this.gradingStatus,
        totalScore: totalScore.present ? totalScore.value : this.totalScore,
        maxScore: maxScore.present ? maxScore.value : this.maxScore,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  Student copyWithCompanion(StudentsCompanion data) {
    return Student(
      id: data.id.present ? data.id.value : this.id,
      serverId: data.serverId.present ? data.serverId.value : this.serverId,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      courseId: data.courseId.present ? data.courseId.value : this.courseId,
      name: data.name.present ? data.name.value : this.name,
      rollNumber:
          data.rollNumber.present ? data.rollNumber.value : this.rollNumber,
      gradingStatus: data.gradingStatus.present
          ? data.gradingStatus.value
          : this.gradingStatus,
      totalScore:
          data.totalScore.present ? data.totalScore.value : this.totalScore,
      maxScore: data.maxScore.present ? data.maxScore.value : this.maxScore,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Student(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('courseId: $courseId, ')
          ..write('name: $name, ')
          ..write('rollNumber: $rollNumber, ')
          ..write('gradingStatus: $gradingStatus, ')
          ..write('totalScore: $totalScore, ')
          ..write('maxScore: $maxScore, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, serverId, syncStatus, courseId, name,
      rollNumber, gradingStatus, totalScore, maxScore, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Student &&
          other.id == this.id &&
          other.serverId == this.serverId &&
          other.syncStatus == this.syncStatus &&
          other.courseId == this.courseId &&
          other.name == this.name &&
          other.rollNumber == this.rollNumber &&
          other.gradingStatus == this.gradingStatus &&
          other.totalScore == this.totalScore &&
          other.maxScore == this.maxScore &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class StudentsCompanion extends UpdateCompanion<Student> {
  final Value<String> id;
  final Value<String?> serverId;
  final Value<int> syncStatus;
  final Value<String> courseId;
  final Value<String> name;
  final Value<String> rollNumber;
  final Value<String> gradingStatus;
  final Value<double?> totalScore;
  final Value<double?> maxScore;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const StudentsCompanion({
    this.id = const Value.absent(),
    this.serverId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.courseId = const Value.absent(),
    this.name = const Value.absent(),
    this.rollNumber = const Value.absent(),
    this.gradingStatus = const Value.absent(),
    this.totalScore = const Value.absent(),
    this.maxScore = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  StudentsCompanion.insert({
    required String id,
    this.serverId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    required String courseId,
    required String name,
    required String rollNumber,
    this.gradingStatus = const Value.absent(),
    this.totalScore = const Value.absent(),
    this.maxScore = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        courseId = Value(courseId),
        name = Value(name),
        rollNumber = Value(rollNumber);
  static Insertable<Student> custom({
    Expression<String>? id,
    Expression<String>? serverId,
    Expression<int>? syncStatus,
    Expression<String>? courseId,
    Expression<String>? name,
    Expression<String>? rollNumber,
    Expression<String>? gradingStatus,
    Expression<double>? totalScore,
    Expression<double>? maxScore,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (serverId != null) 'server_id': serverId,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (courseId != null) 'course_id': courseId,
      if (name != null) 'name': name,
      if (rollNumber != null) 'roll_number': rollNumber,
      if (gradingStatus != null) 'grading_status': gradingStatus,
      if (totalScore != null) 'total_score': totalScore,
      if (maxScore != null) 'max_score': maxScore,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  StudentsCompanion copyWith(
      {Value<String>? id,
      Value<String?>? serverId,
      Value<int>? syncStatus,
      Value<String>? courseId,
      Value<String>? name,
      Value<String>? rollNumber,
      Value<String>? gradingStatus,
      Value<double?>? totalScore,
      Value<double?>? maxScore,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return StudentsCompanion(
      id: id ?? this.id,
      serverId: serverId ?? this.serverId,
      syncStatus: syncStatus ?? this.syncStatus,
      courseId: courseId ?? this.courseId,
      name: name ?? this.name,
      rollNumber: rollNumber ?? this.rollNumber,
      gradingStatus: gradingStatus ?? this.gradingStatus,
      totalScore: totalScore ?? this.totalScore,
      maxScore: maxScore ?? this.maxScore,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (serverId.present) {
      map['server_id'] = Variable<String>(serverId.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(syncStatus.value);
    }
    if (courseId.present) {
      map['course_id'] = Variable<String>(courseId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (rollNumber.present) {
      map['roll_number'] = Variable<String>(rollNumber.value);
    }
    if (gradingStatus.present) {
      map['grading_status'] = Variable<String>(gradingStatus.value);
    }
    if (totalScore.present) {
      map['total_score'] = Variable<double>(totalScore.value);
    }
    if (maxScore.present) {
      map['max_score'] = Variable<double>(maxScore.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('StudentsCompanion(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('courseId: $courseId, ')
          ..write('name: $name, ')
          ..write('rollNumber: $rollNumber, ')
          ..write('gradingStatus: $gradingStatus, ')
          ..write('totalScore: $totalScore, ')
          ..write('maxScore: $maxScore, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SubmissionsTable extends Submissions
    with TableInfo<$SubmissionsTable, Submission> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SubmissionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _serverIdMeta =
      const VerificationMeta('serverId');
  @override
  late final GeneratedColumn<String> serverId = GeneratedColumn<String>(
      'server_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<int> syncStatus = GeneratedColumn<int>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _studentIdMeta =
      const VerificationMeta('studentId');
  @override
  late final GeneratedColumn<String> studentId = GeneratedColumn<String>(
      'student_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _courseIdMeta =
      const VerificationMeta('courseId');
  @override
  late final GeneratedColumn<String> courseId = GeneratedColumn<String>(
      'course_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _coverPagePathMeta =
      const VerificationMeta('coverPagePath');
  @override
  late final GeneratedColumn<String> coverPagePath = GeneratedColumn<String>(
      'cover_page_path', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _gradingRequestedMeta =
      const VerificationMeta('gradingRequested');
  @override
  late final GeneratedColumn<bool> gradingRequested = GeneratedColumn<bool>(
      'grading_requested', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("grading_requested" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        serverId,
        syncStatus,
        studentId,
        courseId,
        status,
        coverPagePath,
        gradingRequested,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'submissions';
  @override
  VerificationContext validateIntegrity(Insertable<Submission> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('server_id')) {
      context.handle(_serverIdMeta,
          serverId.isAcceptableOrUnknown(data['server_id']!, _serverIdMeta));
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('student_id')) {
      context.handle(_studentIdMeta,
          studentId.isAcceptableOrUnknown(data['student_id']!, _studentIdMeta));
    } else if (isInserting) {
      context.missing(_studentIdMeta);
    }
    if (data.containsKey('course_id')) {
      context.handle(_courseIdMeta,
          courseId.isAcceptableOrUnknown(data['course_id']!, _courseIdMeta));
    } else if (isInserting) {
      context.missing(_courseIdMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('cover_page_path')) {
      context.handle(
          _coverPagePathMeta,
          coverPagePath.isAcceptableOrUnknown(
              data['cover_page_path']!, _coverPagePathMeta));
    }
    if (data.containsKey('grading_requested')) {
      context.handle(
          _gradingRequestedMeta,
          gradingRequested.isAcceptableOrUnknown(
              data['grading_requested']!, _gradingRequestedMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Submission map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Submission(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      serverId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}server_id']),
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!,
      studentId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}student_id'])!,
      courseId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}course_id'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      coverPagePath: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}cover_page_path']),
      gradingRequested: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}grading_requested'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $SubmissionsTable createAlias(String alias) {
    return $SubmissionsTable(attachedDatabase, alias);
  }
}

class Submission extends DataClass implements Insertable<Submission> {
  /// Client-generated UUID primary key.
  final String id;

  /// Server-assigned ID after sync. Null means created offline.
  final String? serverId;

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  final int syncStatus;

  /// Foreign key to students table.
  final String studentId;

  /// Foreign key to courses table.
  final String courseId;

  /// Submission status: pending, uploading, processing, graded, error.
  final String status;

  /// Local path to the cover page scan image.
  final String? coverPagePath;

  /// Whether the professor has requested grading before upload completed.
  /// When true, the sync engine will auto-submit for grading after upload.
  final bool gradingRequested;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;
  const Submission(
      {required this.id,
      this.serverId,
      required this.syncStatus,
      required this.studentId,
      required this.courseId,
      required this.status,
      this.coverPagePath,
      required this.gradingRequested,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || serverId != null) {
      map['server_id'] = Variable<String>(serverId);
    }
    map['sync_status'] = Variable<int>(syncStatus);
    map['student_id'] = Variable<String>(studentId);
    map['course_id'] = Variable<String>(courseId);
    map['status'] = Variable<String>(status);
    if (!nullToAbsent || coverPagePath != null) {
      map['cover_page_path'] = Variable<String>(coverPagePath);
    }
    map['grading_requested'] = Variable<bool>(gradingRequested);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  SubmissionsCompanion toCompanion(bool nullToAbsent) {
    return SubmissionsCompanion(
      id: Value(id),
      serverId: serverId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverId),
      syncStatus: Value(syncStatus),
      studentId: Value(studentId),
      courseId: Value(courseId),
      status: Value(status),
      coverPagePath: coverPagePath == null && nullToAbsent
          ? const Value.absent()
          : Value(coverPagePath),
      gradingRequested: Value(gradingRequested),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory Submission.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Submission(
      id: serializer.fromJson<String>(json['id']),
      serverId: serializer.fromJson<String?>(json['serverId']),
      syncStatus: serializer.fromJson<int>(json['syncStatus']),
      studentId: serializer.fromJson<String>(json['studentId']),
      courseId: serializer.fromJson<String>(json['courseId']),
      status: serializer.fromJson<String>(json['status']),
      coverPagePath: serializer.fromJson<String?>(json['coverPagePath']),
      gradingRequested: serializer.fromJson<bool>(json['gradingRequested']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'serverId': serializer.toJson<String?>(serverId),
      'syncStatus': serializer.toJson<int>(syncStatus),
      'studentId': serializer.toJson<String>(studentId),
      'courseId': serializer.toJson<String>(courseId),
      'status': serializer.toJson<String>(status),
      'coverPagePath': serializer.toJson<String?>(coverPagePath),
      'gradingRequested': serializer.toJson<bool>(gradingRequested),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  Submission copyWith(
          {String? id,
          Value<String?> serverId = const Value.absent(),
          int? syncStatus,
          String? studentId,
          String? courseId,
          String? status,
          Value<String?> coverPagePath = const Value.absent(),
          bool? gradingRequested,
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      Submission(
        id: id ?? this.id,
        serverId: serverId.present ? serverId.value : this.serverId,
        syncStatus: syncStatus ?? this.syncStatus,
        studentId: studentId ?? this.studentId,
        courseId: courseId ?? this.courseId,
        status: status ?? this.status,
        coverPagePath:
            coverPagePath.present ? coverPagePath.value : this.coverPagePath,
        gradingRequested: gradingRequested ?? this.gradingRequested,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  Submission copyWithCompanion(SubmissionsCompanion data) {
    return Submission(
      id: data.id.present ? data.id.value : this.id,
      serverId: data.serverId.present ? data.serverId.value : this.serverId,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      studentId: data.studentId.present ? data.studentId.value : this.studentId,
      courseId: data.courseId.present ? data.courseId.value : this.courseId,
      status: data.status.present ? data.status.value : this.status,
      coverPagePath: data.coverPagePath.present
          ? data.coverPagePath.value
          : this.coverPagePath,
      gradingRequested: data.gradingRequested.present
          ? data.gradingRequested.value
          : this.gradingRequested,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Submission(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('studentId: $studentId, ')
          ..write('courseId: $courseId, ')
          ..write('status: $status, ')
          ..write('coverPagePath: $coverPagePath, ')
          ..write('gradingRequested: $gradingRequested, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, serverId, syncStatus, studentId, courseId,
      status, coverPagePath, gradingRequested, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Submission &&
          other.id == this.id &&
          other.serverId == this.serverId &&
          other.syncStatus == this.syncStatus &&
          other.studentId == this.studentId &&
          other.courseId == this.courseId &&
          other.status == this.status &&
          other.coverPagePath == this.coverPagePath &&
          other.gradingRequested == this.gradingRequested &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class SubmissionsCompanion extends UpdateCompanion<Submission> {
  final Value<String> id;
  final Value<String?> serverId;
  final Value<int> syncStatus;
  final Value<String> studentId;
  final Value<String> courseId;
  final Value<String> status;
  final Value<String?> coverPagePath;
  final Value<bool> gradingRequested;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const SubmissionsCompanion({
    this.id = const Value.absent(),
    this.serverId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.studentId = const Value.absent(),
    this.courseId = const Value.absent(),
    this.status = const Value.absent(),
    this.coverPagePath = const Value.absent(),
    this.gradingRequested = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SubmissionsCompanion.insert({
    required String id,
    this.serverId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    required String studentId,
    required String courseId,
    this.status = const Value.absent(),
    this.coverPagePath = const Value.absent(),
    this.gradingRequested = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        studentId = Value(studentId),
        courseId = Value(courseId);
  static Insertable<Submission> custom({
    Expression<String>? id,
    Expression<String>? serverId,
    Expression<int>? syncStatus,
    Expression<String>? studentId,
    Expression<String>? courseId,
    Expression<String>? status,
    Expression<String>? coverPagePath,
    Expression<bool>? gradingRequested,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (serverId != null) 'server_id': serverId,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (studentId != null) 'student_id': studentId,
      if (courseId != null) 'course_id': courseId,
      if (status != null) 'status': status,
      if (coverPagePath != null) 'cover_page_path': coverPagePath,
      if (gradingRequested != null) 'grading_requested': gradingRequested,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SubmissionsCompanion copyWith(
      {Value<String>? id,
      Value<String?>? serverId,
      Value<int>? syncStatus,
      Value<String>? studentId,
      Value<String>? courseId,
      Value<String>? status,
      Value<String?>? coverPagePath,
      Value<bool>? gradingRequested,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return SubmissionsCompanion(
      id: id ?? this.id,
      serverId: serverId ?? this.serverId,
      syncStatus: syncStatus ?? this.syncStatus,
      studentId: studentId ?? this.studentId,
      courseId: courseId ?? this.courseId,
      status: status ?? this.status,
      coverPagePath: coverPagePath ?? this.coverPagePath,
      gradingRequested: gradingRequested ?? this.gradingRequested,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (serverId.present) {
      map['server_id'] = Variable<String>(serverId.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(syncStatus.value);
    }
    if (studentId.present) {
      map['student_id'] = Variable<String>(studentId.value);
    }
    if (courseId.present) {
      map['course_id'] = Variable<String>(courseId.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (coverPagePath.present) {
      map['cover_page_path'] = Variable<String>(coverPagePath.value);
    }
    if (gradingRequested.present) {
      map['grading_requested'] = Variable<bool>(gradingRequested.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SubmissionsCompanion(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('studentId: $studentId, ')
          ..write('courseId: $courseId, ')
          ..write('status: $status, ')
          ..write('coverPagePath: $coverPagePath, ')
          ..write('gradingRequested: $gradingRequested, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ScannedPagesTable extends ScannedPages
    with TableInfo<$ScannedPagesTable, ScannedPage> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ScannedPagesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _serverIdMeta =
      const VerificationMeta('serverId');
  @override
  late final GeneratedColumn<String> serverId = GeneratedColumn<String>(
      'server_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<int> syncStatus = GeneratedColumn<int>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _submissionIdMeta =
      const VerificationMeta('submissionId');
  @override
  late final GeneratedColumn<String> submissionId = GeneratedColumn<String>(
      'submission_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _pageNumberMeta =
      const VerificationMeta('pageNumber');
  @override
  late final GeneratedColumn<int> pageNumber = GeneratedColumn<int>(
      'page_number', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _localPathMeta =
      const VerificationMeta('localPath');
  @override
  late final GeneratedColumn<String> localPath = GeneratedColumn<String>(
      'local_path', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _uploadedUrlMeta =
      const VerificationMeta('uploadedUrl');
  @override
  late final GeneratedColumn<String> uploadedUrl = GeneratedColumn<String>(
      'uploaded_url', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isBlurryMeta =
      const VerificationMeta('isBlurry');
  @override
  late final GeneratedColumn<bool> isBlurry = GeneratedColumn<bool>(
      'is_blurry', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_blurry" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
      'type', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('answer'));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        serverId,
        syncStatus,
        submissionId,
        pageNumber,
        localPath,
        uploadedUrl,
        isBlurry,
        type,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'scanned_pages';
  @override
  VerificationContext validateIntegrity(Insertable<ScannedPage> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('server_id')) {
      context.handle(_serverIdMeta,
          serverId.isAcceptableOrUnknown(data['server_id']!, _serverIdMeta));
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('submission_id')) {
      context.handle(
          _submissionIdMeta,
          submissionId.isAcceptableOrUnknown(
              data['submission_id']!, _submissionIdMeta));
    } else if (isInserting) {
      context.missing(_submissionIdMeta);
    }
    if (data.containsKey('page_number')) {
      context.handle(
          _pageNumberMeta,
          pageNumber.isAcceptableOrUnknown(
              data['page_number']!, _pageNumberMeta));
    } else if (isInserting) {
      context.missing(_pageNumberMeta);
    }
    if (data.containsKey('local_path')) {
      context.handle(_localPathMeta,
          localPath.isAcceptableOrUnknown(data['local_path']!, _localPathMeta));
    } else if (isInserting) {
      context.missing(_localPathMeta);
    }
    if (data.containsKey('uploaded_url')) {
      context.handle(
          _uploadedUrlMeta,
          uploadedUrl.isAcceptableOrUnknown(
              data['uploaded_url']!, _uploadedUrlMeta));
    }
    if (data.containsKey('is_blurry')) {
      context.handle(_isBlurryMeta,
          isBlurry.isAcceptableOrUnknown(data['is_blurry']!, _isBlurryMeta));
    }
    if (data.containsKey('type')) {
      context.handle(
          _typeMeta, type.isAcceptableOrUnknown(data['type']!, _typeMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ScannedPage map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ScannedPage(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      serverId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}server_id']),
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!,
      submissionId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}submission_id'])!,
      pageNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}page_number'])!,
      localPath: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}local_path'])!,
      uploadedUrl: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}uploaded_url']),
      isBlurry: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_blurry'])!,
      type: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $ScannedPagesTable createAlias(String alias) {
    return $ScannedPagesTable(attachedDatabase, alias);
  }
}

class ScannedPage extends DataClass implements Insertable<ScannedPage> {
  /// Client-generated UUID primary key.
  final String id;

  /// Server-assigned ID after sync. Null means created offline.
  final String? serverId;

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  final int syncStatus;

  /// Foreign key to submissions table.
  final String submissionId;

  /// Sequential page number within the submission.
  final int pageNumber;

  /// Local file path to the scanned image.
  final String localPath;

  /// Server URL after upload. Null means not yet uploaded.
  final String? uploadedUrl;

  /// Quality flag -- true if the scan was detected as blurry.
  final bool isBlurry;

  /// Page type: "cover", "answer", "question_paper", "answer_key".
  final String type;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;
  const ScannedPage(
      {required this.id,
      this.serverId,
      required this.syncStatus,
      required this.submissionId,
      required this.pageNumber,
      required this.localPath,
      this.uploadedUrl,
      required this.isBlurry,
      required this.type,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || serverId != null) {
      map['server_id'] = Variable<String>(serverId);
    }
    map['sync_status'] = Variable<int>(syncStatus);
    map['submission_id'] = Variable<String>(submissionId);
    map['page_number'] = Variable<int>(pageNumber);
    map['local_path'] = Variable<String>(localPath);
    if (!nullToAbsent || uploadedUrl != null) {
      map['uploaded_url'] = Variable<String>(uploadedUrl);
    }
    map['is_blurry'] = Variable<bool>(isBlurry);
    map['type'] = Variable<String>(type);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  ScannedPagesCompanion toCompanion(bool nullToAbsent) {
    return ScannedPagesCompanion(
      id: Value(id),
      serverId: serverId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverId),
      syncStatus: Value(syncStatus),
      submissionId: Value(submissionId),
      pageNumber: Value(pageNumber),
      localPath: Value(localPath),
      uploadedUrl: uploadedUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(uploadedUrl),
      isBlurry: Value(isBlurry),
      type: Value(type),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory ScannedPage.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ScannedPage(
      id: serializer.fromJson<String>(json['id']),
      serverId: serializer.fromJson<String?>(json['serverId']),
      syncStatus: serializer.fromJson<int>(json['syncStatus']),
      submissionId: serializer.fromJson<String>(json['submissionId']),
      pageNumber: serializer.fromJson<int>(json['pageNumber']),
      localPath: serializer.fromJson<String>(json['localPath']),
      uploadedUrl: serializer.fromJson<String?>(json['uploadedUrl']),
      isBlurry: serializer.fromJson<bool>(json['isBlurry']),
      type: serializer.fromJson<String>(json['type']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'serverId': serializer.toJson<String?>(serverId),
      'syncStatus': serializer.toJson<int>(syncStatus),
      'submissionId': serializer.toJson<String>(submissionId),
      'pageNumber': serializer.toJson<int>(pageNumber),
      'localPath': serializer.toJson<String>(localPath),
      'uploadedUrl': serializer.toJson<String?>(uploadedUrl),
      'isBlurry': serializer.toJson<bool>(isBlurry),
      'type': serializer.toJson<String>(type),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  ScannedPage copyWith(
          {String? id,
          Value<String?> serverId = const Value.absent(),
          int? syncStatus,
          String? submissionId,
          int? pageNumber,
          String? localPath,
          Value<String?> uploadedUrl = const Value.absent(),
          bool? isBlurry,
          String? type,
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      ScannedPage(
        id: id ?? this.id,
        serverId: serverId.present ? serverId.value : this.serverId,
        syncStatus: syncStatus ?? this.syncStatus,
        submissionId: submissionId ?? this.submissionId,
        pageNumber: pageNumber ?? this.pageNumber,
        localPath: localPath ?? this.localPath,
        uploadedUrl: uploadedUrl.present ? uploadedUrl.value : this.uploadedUrl,
        isBlurry: isBlurry ?? this.isBlurry,
        type: type ?? this.type,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  ScannedPage copyWithCompanion(ScannedPagesCompanion data) {
    return ScannedPage(
      id: data.id.present ? data.id.value : this.id,
      serverId: data.serverId.present ? data.serverId.value : this.serverId,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      submissionId: data.submissionId.present
          ? data.submissionId.value
          : this.submissionId,
      pageNumber:
          data.pageNumber.present ? data.pageNumber.value : this.pageNumber,
      localPath: data.localPath.present ? data.localPath.value : this.localPath,
      uploadedUrl:
          data.uploadedUrl.present ? data.uploadedUrl.value : this.uploadedUrl,
      isBlurry: data.isBlurry.present ? data.isBlurry.value : this.isBlurry,
      type: data.type.present ? data.type.value : this.type,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ScannedPage(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('submissionId: $submissionId, ')
          ..write('pageNumber: $pageNumber, ')
          ..write('localPath: $localPath, ')
          ..write('uploadedUrl: $uploadedUrl, ')
          ..write('isBlurry: $isBlurry, ')
          ..write('type: $type, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, serverId, syncStatus, submissionId,
      pageNumber, localPath, uploadedUrl, isBlurry, type, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ScannedPage &&
          other.id == this.id &&
          other.serverId == this.serverId &&
          other.syncStatus == this.syncStatus &&
          other.submissionId == this.submissionId &&
          other.pageNumber == this.pageNumber &&
          other.localPath == this.localPath &&
          other.uploadedUrl == this.uploadedUrl &&
          other.isBlurry == this.isBlurry &&
          other.type == this.type &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class ScannedPagesCompanion extends UpdateCompanion<ScannedPage> {
  final Value<String> id;
  final Value<String?> serverId;
  final Value<int> syncStatus;
  final Value<String> submissionId;
  final Value<int> pageNumber;
  final Value<String> localPath;
  final Value<String?> uploadedUrl;
  final Value<bool> isBlurry;
  final Value<String> type;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const ScannedPagesCompanion({
    this.id = const Value.absent(),
    this.serverId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.submissionId = const Value.absent(),
    this.pageNumber = const Value.absent(),
    this.localPath = const Value.absent(),
    this.uploadedUrl = const Value.absent(),
    this.isBlurry = const Value.absent(),
    this.type = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ScannedPagesCompanion.insert({
    required String id,
    this.serverId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    required String submissionId,
    required int pageNumber,
    required String localPath,
    this.uploadedUrl = const Value.absent(),
    this.isBlurry = const Value.absent(),
    this.type = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        submissionId = Value(submissionId),
        pageNumber = Value(pageNumber),
        localPath = Value(localPath);
  static Insertable<ScannedPage> custom({
    Expression<String>? id,
    Expression<String>? serverId,
    Expression<int>? syncStatus,
    Expression<String>? submissionId,
    Expression<int>? pageNumber,
    Expression<String>? localPath,
    Expression<String>? uploadedUrl,
    Expression<bool>? isBlurry,
    Expression<String>? type,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (serverId != null) 'server_id': serverId,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (submissionId != null) 'submission_id': submissionId,
      if (pageNumber != null) 'page_number': pageNumber,
      if (localPath != null) 'local_path': localPath,
      if (uploadedUrl != null) 'uploaded_url': uploadedUrl,
      if (isBlurry != null) 'is_blurry': isBlurry,
      if (type != null) 'type': type,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ScannedPagesCompanion copyWith(
      {Value<String>? id,
      Value<String?>? serverId,
      Value<int>? syncStatus,
      Value<String>? submissionId,
      Value<int>? pageNumber,
      Value<String>? localPath,
      Value<String?>? uploadedUrl,
      Value<bool>? isBlurry,
      Value<String>? type,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return ScannedPagesCompanion(
      id: id ?? this.id,
      serverId: serverId ?? this.serverId,
      syncStatus: syncStatus ?? this.syncStatus,
      submissionId: submissionId ?? this.submissionId,
      pageNumber: pageNumber ?? this.pageNumber,
      localPath: localPath ?? this.localPath,
      uploadedUrl: uploadedUrl ?? this.uploadedUrl,
      isBlurry: isBlurry ?? this.isBlurry,
      type: type ?? this.type,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (serverId.present) {
      map['server_id'] = Variable<String>(serverId.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(syncStatus.value);
    }
    if (submissionId.present) {
      map['submission_id'] = Variable<String>(submissionId.value);
    }
    if (pageNumber.present) {
      map['page_number'] = Variable<int>(pageNumber.value);
    }
    if (localPath.present) {
      map['local_path'] = Variable<String>(localPath.value);
    }
    if (uploadedUrl.present) {
      map['uploaded_url'] = Variable<String>(uploadedUrl.value);
    }
    if (isBlurry.present) {
      map['is_blurry'] = Variable<bool>(isBlurry.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ScannedPagesCompanion(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('submissionId: $submissionId, ')
          ..write('pageNumber: $pageNumber, ')
          ..write('localPath: $localPath, ')
          ..write('uploadedUrl: $uploadedUrl, ')
          ..write('isBlurry: $isBlurry, ')
          ..write('type: $type, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $GradingResultsTable extends GradingResults
    with TableInfo<$GradingResultsTable, GradingResult> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $GradingResultsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _submissionIdMeta =
      const VerificationMeta('submissionId');
  @override
  late final GeneratedColumn<String> submissionId = GeneratedColumn<String>(
      'submission_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _studentIdMeta =
      const VerificationMeta('studentId');
  @override
  late final GeneratedColumn<String> studentId = GeneratedColumn<String>(
      'student_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _courseIdMeta =
      const VerificationMeta('courseId');
  @override
  late final GeneratedColumn<String> courseId = GeneratedColumn<String>(
      'course_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _questionIdMeta =
      const VerificationMeta('questionId');
  @override
  late final GeneratedColumn<String> questionId = GeneratedColumn<String>(
      'question_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _scoreMeta = const VerificationMeta('score');
  @override
  late final GeneratedColumn<double> score = GeneratedColumn<double>(
      'score', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _maxScoreMeta =
      const VerificationMeta('maxScore');
  @override
  late final GeneratedColumn<double> maxScore = GeneratedColumn<double>(
      'max_score', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _percentageMeta =
      const VerificationMeta('percentage');
  @override
  late final GeneratedColumn<double> percentage = GeneratedColumn<double>(
      'percentage', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _reasoningMeta =
      const VerificationMeta('reasoning');
  @override
  late final GeneratedColumn<String> reasoning = GeneratedColumn<String>(
      'reasoning', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _feedbackMeta =
      const VerificationMeta('feedback');
  @override
  late final GeneratedColumn<String> feedback = GeneratedColumn<String>(
      'feedback', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _graderMeta = const VerificationMeta('grader');
  @override
  late final GeneratedColumn<String> grader = GeneratedColumn<String>(
      'grader', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _confidenceMeta =
      const VerificationMeta('confidence');
  @override
  late final GeneratedColumn<double> confidence = GeneratedColumn<double>(
      'confidence', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('graded'));
  static const VerificationMeta _failureReasonMeta =
      const VerificationMeta('failureReason');
  @override
  late final GeneratedColumn<String> failureReason = GeneratedColumn<String>(
      'failure_reason', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isOverriddenMeta =
      const VerificationMeta('isOverridden');
  @override
  late final GeneratedColumn<bool> isOverridden = GeneratedColumn<bool>(
      'is_overridden', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("is_overridden" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _overrideScoreMeta =
      const VerificationMeta('overrideScore');
  @override
  late final GeneratedColumn<double> overrideScore = GeneratedColumn<double>(
      'override_score', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _overrideNoteMeta =
      const VerificationMeta('overrideNote');
  @override
  late final GeneratedColumn<String> overrideNote = GeneratedColumn<String>(
      'override_note', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<int> syncStatus = GeneratedColumn<int>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        submissionId,
        studentId,
        courseId,
        questionId,
        score,
        maxScore,
        percentage,
        reasoning,
        feedback,
        grader,
        confidence,
        status,
        failureReason,
        isOverridden,
        overrideScore,
        overrideNote,
        syncStatus,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'grading_results';
  @override
  VerificationContext validateIntegrity(Insertable<GradingResult> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('submission_id')) {
      context.handle(
          _submissionIdMeta,
          submissionId.isAcceptableOrUnknown(
              data['submission_id']!, _submissionIdMeta));
    } else if (isInserting) {
      context.missing(_submissionIdMeta);
    }
    if (data.containsKey('student_id')) {
      context.handle(_studentIdMeta,
          studentId.isAcceptableOrUnknown(data['student_id']!, _studentIdMeta));
    } else if (isInserting) {
      context.missing(_studentIdMeta);
    }
    if (data.containsKey('course_id')) {
      context.handle(_courseIdMeta,
          courseId.isAcceptableOrUnknown(data['course_id']!, _courseIdMeta));
    } else if (isInserting) {
      context.missing(_courseIdMeta);
    }
    if (data.containsKey('question_id')) {
      context.handle(
          _questionIdMeta,
          questionId.isAcceptableOrUnknown(
              data['question_id']!, _questionIdMeta));
    } else if (isInserting) {
      context.missing(_questionIdMeta);
    }
    if (data.containsKey('score')) {
      context.handle(
          _scoreMeta, score.isAcceptableOrUnknown(data['score']!, _scoreMeta));
    } else if (isInserting) {
      context.missing(_scoreMeta);
    }
    if (data.containsKey('max_score')) {
      context.handle(_maxScoreMeta,
          maxScore.isAcceptableOrUnknown(data['max_score']!, _maxScoreMeta));
    } else if (isInserting) {
      context.missing(_maxScoreMeta);
    }
    if (data.containsKey('percentage')) {
      context.handle(
          _percentageMeta,
          percentage.isAcceptableOrUnknown(
              data['percentage']!, _percentageMeta));
    } else if (isInserting) {
      context.missing(_percentageMeta);
    }
    if (data.containsKey('reasoning')) {
      context.handle(_reasoningMeta,
          reasoning.isAcceptableOrUnknown(data['reasoning']!, _reasoningMeta));
    } else if (isInserting) {
      context.missing(_reasoningMeta);
    }
    if (data.containsKey('feedback')) {
      context.handle(_feedbackMeta,
          feedback.isAcceptableOrUnknown(data['feedback']!, _feedbackMeta));
    } else if (isInserting) {
      context.missing(_feedbackMeta);
    }
    if (data.containsKey('grader')) {
      context.handle(_graderMeta,
          grader.isAcceptableOrUnknown(data['grader']!, _graderMeta));
    } else if (isInserting) {
      context.missing(_graderMeta);
    }
    if (data.containsKey('confidence')) {
      context.handle(
          _confidenceMeta,
          confidence.isAcceptableOrUnknown(
              data['confidence']!, _confidenceMeta));
    } else if (isInserting) {
      context.missing(_confidenceMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('failure_reason')) {
      context.handle(
          _failureReasonMeta,
          failureReason.isAcceptableOrUnknown(
              data['failure_reason']!, _failureReasonMeta));
    }
    if (data.containsKey('is_overridden')) {
      context.handle(
          _isOverriddenMeta,
          isOverridden.isAcceptableOrUnknown(
              data['is_overridden']!, _isOverriddenMeta));
    }
    if (data.containsKey('override_score')) {
      context.handle(
          _overrideScoreMeta,
          overrideScore.isAcceptableOrUnknown(
              data['override_score']!, _overrideScoreMeta));
    }
    if (data.containsKey('override_note')) {
      context.handle(
          _overrideNoteMeta,
          overrideNote.isAcceptableOrUnknown(
              data['override_note']!, _overrideNoteMeta));
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  GradingResult map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return GradingResult(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      submissionId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}submission_id'])!,
      studentId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}student_id'])!,
      courseId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}course_id'])!,
      questionId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}question_id'])!,
      score: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}score'])!,
      maxScore: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}max_score'])!,
      percentage: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}percentage'])!,
      reasoning: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}reasoning'])!,
      feedback: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}feedback'])!,
      grader: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}grader'])!,
      confidence: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}confidence'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      failureReason: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}failure_reason']),
      isOverridden: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_overridden'])!,
      overrideScore: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}override_score']),
      overrideNote: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}override_note']),
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $GradingResultsTable createAlias(String alias) {
    return $GradingResultsTable(attachedDatabase, alias);
  }
}

class GradingResult extends DataClass implements Insertable<GradingResult> {
  /// Client-generated UUID primary key.
  final String id;

  /// Foreign key to submissions table.
  final String submissionId;

  /// Foreign key to students table for quick lookups.
  final String studentId;

  /// Foreign key to courses table for course-level queries.
  final String courseId;

  /// Question identifier from the backend (e.g., "Q1", "Q2a").
  final String questionId;

  /// AI-assigned score -- this is the ORIGINAL AI score and is NEVER mutated.
  final double score;

  /// Maximum possible score for this question.
  final double maxScore;

  /// Score as a percentage (0-100).
  final double percentage;

  /// AI reasoning text explaining the score.
  final String reasoning;

  /// Constructive feedback for the student.
  final String feedback;

  /// Which grader agent evaluated this question (e.g., "math", "english").
  final String grader;

  /// Grader confidence level (0.0 - 1.0).
  final double confidence;

  /// Result status: 'graded' or 'failed' (for partial results where some
  /// questions could not be graded).
  final String status;

  /// Reason for failure if the question could not be graded. Null on success.
  final String? failureReason;

  /// Whether a professor has overridden the AI score.
  final bool isOverridden;

  /// Professor's manual score. Null unless overridden.
  final double? overrideScore;

  /// Optional reason for the override. Null unless overridden.
  final String? overrideNote;

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  final int syncStatus;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;
  const GradingResult(
      {required this.id,
      required this.submissionId,
      required this.studentId,
      required this.courseId,
      required this.questionId,
      required this.score,
      required this.maxScore,
      required this.percentage,
      required this.reasoning,
      required this.feedback,
      required this.grader,
      required this.confidence,
      required this.status,
      this.failureReason,
      required this.isOverridden,
      this.overrideScore,
      this.overrideNote,
      required this.syncStatus,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['submission_id'] = Variable<String>(submissionId);
    map['student_id'] = Variable<String>(studentId);
    map['course_id'] = Variable<String>(courseId);
    map['question_id'] = Variable<String>(questionId);
    map['score'] = Variable<double>(score);
    map['max_score'] = Variable<double>(maxScore);
    map['percentage'] = Variable<double>(percentage);
    map['reasoning'] = Variable<String>(reasoning);
    map['feedback'] = Variable<String>(feedback);
    map['grader'] = Variable<String>(grader);
    map['confidence'] = Variable<double>(confidence);
    map['status'] = Variable<String>(status);
    if (!nullToAbsent || failureReason != null) {
      map['failure_reason'] = Variable<String>(failureReason);
    }
    map['is_overridden'] = Variable<bool>(isOverridden);
    if (!nullToAbsent || overrideScore != null) {
      map['override_score'] = Variable<double>(overrideScore);
    }
    if (!nullToAbsent || overrideNote != null) {
      map['override_note'] = Variable<String>(overrideNote);
    }
    map['sync_status'] = Variable<int>(syncStatus);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  GradingResultsCompanion toCompanion(bool nullToAbsent) {
    return GradingResultsCompanion(
      id: Value(id),
      submissionId: Value(submissionId),
      studentId: Value(studentId),
      courseId: Value(courseId),
      questionId: Value(questionId),
      score: Value(score),
      maxScore: Value(maxScore),
      percentage: Value(percentage),
      reasoning: Value(reasoning),
      feedback: Value(feedback),
      grader: Value(grader),
      confidence: Value(confidence),
      status: Value(status),
      failureReason: failureReason == null && nullToAbsent
          ? const Value.absent()
          : Value(failureReason),
      isOverridden: Value(isOverridden),
      overrideScore: overrideScore == null && nullToAbsent
          ? const Value.absent()
          : Value(overrideScore),
      overrideNote: overrideNote == null && nullToAbsent
          ? const Value.absent()
          : Value(overrideNote),
      syncStatus: Value(syncStatus),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory GradingResult.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return GradingResult(
      id: serializer.fromJson<String>(json['id']),
      submissionId: serializer.fromJson<String>(json['submissionId']),
      studentId: serializer.fromJson<String>(json['studentId']),
      courseId: serializer.fromJson<String>(json['courseId']),
      questionId: serializer.fromJson<String>(json['questionId']),
      score: serializer.fromJson<double>(json['score']),
      maxScore: serializer.fromJson<double>(json['maxScore']),
      percentage: serializer.fromJson<double>(json['percentage']),
      reasoning: serializer.fromJson<String>(json['reasoning']),
      feedback: serializer.fromJson<String>(json['feedback']),
      grader: serializer.fromJson<String>(json['grader']),
      confidence: serializer.fromJson<double>(json['confidence']),
      status: serializer.fromJson<String>(json['status']),
      failureReason: serializer.fromJson<String?>(json['failureReason']),
      isOverridden: serializer.fromJson<bool>(json['isOverridden']),
      overrideScore: serializer.fromJson<double?>(json['overrideScore']),
      overrideNote: serializer.fromJson<String?>(json['overrideNote']),
      syncStatus: serializer.fromJson<int>(json['syncStatus']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'submissionId': serializer.toJson<String>(submissionId),
      'studentId': serializer.toJson<String>(studentId),
      'courseId': serializer.toJson<String>(courseId),
      'questionId': serializer.toJson<String>(questionId),
      'score': serializer.toJson<double>(score),
      'maxScore': serializer.toJson<double>(maxScore),
      'percentage': serializer.toJson<double>(percentage),
      'reasoning': serializer.toJson<String>(reasoning),
      'feedback': serializer.toJson<String>(feedback),
      'grader': serializer.toJson<String>(grader),
      'confidence': serializer.toJson<double>(confidence),
      'status': serializer.toJson<String>(status),
      'failureReason': serializer.toJson<String?>(failureReason),
      'isOverridden': serializer.toJson<bool>(isOverridden),
      'overrideScore': serializer.toJson<double?>(overrideScore),
      'overrideNote': serializer.toJson<String?>(overrideNote),
      'syncStatus': serializer.toJson<int>(syncStatus),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  GradingResult copyWith(
          {String? id,
          String? submissionId,
          String? studentId,
          String? courseId,
          String? questionId,
          double? score,
          double? maxScore,
          double? percentage,
          String? reasoning,
          String? feedback,
          String? grader,
          double? confidence,
          String? status,
          Value<String?> failureReason = const Value.absent(),
          bool? isOverridden,
          Value<double?> overrideScore = const Value.absent(),
          Value<String?> overrideNote = const Value.absent(),
          int? syncStatus,
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      GradingResult(
        id: id ?? this.id,
        submissionId: submissionId ?? this.submissionId,
        studentId: studentId ?? this.studentId,
        courseId: courseId ?? this.courseId,
        questionId: questionId ?? this.questionId,
        score: score ?? this.score,
        maxScore: maxScore ?? this.maxScore,
        percentage: percentage ?? this.percentage,
        reasoning: reasoning ?? this.reasoning,
        feedback: feedback ?? this.feedback,
        grader: grader ?? this.grader,
        confidence: confidence ?? this.confidence,
        status: status ?? this.status,
        failureReason:
            failureReason.present ? failureReason.value : this.failureReason,
        isOverridden: isOverridden ?? this.isOverridden,
        overrideScore:
            overrideScore.present ? overrideScore.value : this.overrideScore,
        overrideNote:
            overrideNote.present ? overrideNote.value : this.overrideNote,
        syncStatus: syncStatus ?? this.syncStatus,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  GradingResult copyWithCompanion(GradingResultsCompanion data) {
    return GradingResult(
      id: data.id.present ? data.id.value : this.id,
      submissionId: data.submissionId.present
          ? data.submissionId.value
          : this.submissionId,
      studentId: data.studentId.present ? data.studentId.value : this.studentId,
      courseId: data.courseId.present ? data.courseId.value : this.courseId,
      questionId:
          data.questionId.present ? data.questionId.value : this.questionId,
      score: data.score.present ? data.score.value : this.score,
      maxScore: data.maxScore.present ? data.maxScore.value : this.maxScore,
      percentage:
          data.percentage.present ? data.percentage.value : this.percentage,
      reasoning: data.reasoning.present ? data.reasoning.value : this.reasoning,
      feedback: data.feedback.present ? data.feedback.value : this.feedback,
      grader: data.grader.present ? data.grader.value : this.grader,
      confidence:
          data.confidence.present ? data.confidence.value : this.confidence,
      status: data.status.present ? data.status.value : this.status,
      failureReason: data.failureReason.present
          ? data.failureReason.value
          : this.failureReason,
      isOverridden: data.isOverridden.present
          ? data.isOverridden.value
          : this.isOverridden,
      overrideScore: data.overrideScore.present
          ? data.overrideScore.value
          : this.overrideScore,
      overrideNote: data.overrideNote.present
          ? data.overrideNote.value
          : this.overrideNote,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('GradingResult(')
          ..write('id: $id, ')
          ..write('submissionId: $submissionId, ')
          ..write('studentId: $studentId, ')
          ..write('courseId: $courseId, ')
          ..write('questionId: $questionId, ')
          ..write('score: $score, ')
          ..write('maxScore: $maxScore, ')
          ..write('percentage: $percentage, ')
          ..write('reasoning: $reasoning, ')
          ..write('feedback: $feedback, ')
          ..write('grader: $grader, ')
          ..write('confidence: $confidence, ')
          ..write('status: $status, ')
          ..write('failureReason: $failureReason, ')
          ..write('isOverridden: $isOverridden, ')
          ..write('overrideScore: $overrideScore, ')
          ..write('overrideNote: $overrideNote, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      submissionId,
      studentId,
      courseId,
      questionId,
      score,
      maxScore,
      percentage,
      reasoning,
      feedback,
      grader,
      confidence,
      status,
      failureReason,
      isOverridden,
      overrideScore,
      overrideNote,
      syncStatus,
      createdAt,
      updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GradingResult &&
          other.id == this.id &&
          other.submissionId == this.submissionId &&
          other.studentId == this.studentId &&
          other.courseId == this.courseId &&
          other.questionId == this.questionId &&
          other.score == this.score &&
          other.maxScore == this.maxScore &&
          other.percentage == this.percentage &&
          other.reasoning == this.reasoning &&
          other.feedback == this.feedback &&
          other.grader == this.grader &&
          other.confidence == this.confidence &&
          other.status == this.status &&
          other.failureReason == this.failureReason &&
          other.isOverridden == this.isOverridden &&
          other.overrideScore == this.overrideScore &&
          other.overrideNote == this.overrideNote &&
          other.syncStatus == this.syncStatus &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class GradingResultsCompanion extends UpdateCompanion<GradingResult> {
  final Value<String> id;
  final Value<String> submissionId;
  final Value<String> studentId;
  final Value<String> courseId;
  final Value<String> questionId;
  final Value<double> score;
  final Value<double> maxScore;
  final Value<double> percentage;
  final Value<String> reasoning;
  final Value<String> feedback;
  final Value<String> grader;
  final Value<double> confidence;
  final Value<String> status;
  final Value<String?> failureReason;
  final Value<bool> isOverridden;
  final Value<double?> overrideScore;
  final Value<String?> overrideNote;
  final Value<int> syncStatus;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const GradingResultsCompanion({
    this.id = const Value.absent(),
    this.submissionId = const Value.absent(),
    this.studentId = const Value.absent(),
    this.courseId = const Value.absent(),
    this.questionId = const Value.absent(),
    this.score = const Value.absent(),
    this.maxScore = const Value.absent(),
    this.percentage = const Value.absent(),
    this.reasoning = const Value.absent(),
    this.feedback = const Value.absent(),
    this.grader = const Value.absent(),
    this.confidence = const Value.absent(),
    this.status = const Value.absent(),
    this.failureReason = const Value.absent(),
    this.isOverridden = const Value.absent(),
    this.overrideScore = const Value.absent(),
    this.overrideNote = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  GradingResultsCompanion.insert({
    required String id,
    required String submissionId,
    required String studentId,
    required String courseId,
    required String questionId,
    required double score,
    required double maxScore,
    required double percentage,
    required String reasoning,
    required String feedback,
    required String grader,
    required double confidence,
    this.status = const Value.absent(),
    this.failureReason = const Value.absent(),
    this.isOverridden = const Value.absent(),
    this.overrideScore = const Value.absent(),
    this.overrideNote = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        submissionId = Value(submissionId),
        studentId = Value(studentId),
        courseId = Value(courseId),
        questionId = Value(questionId),
        score = Value(score),
        maxScore = Value(maxScore),
        percentage = Value(percentage),
        reasoning = Value(reasoning),
        feedback = Value(feedback),
        grader = Value(grader),
        confidence = Value(confidence);
  static Insertable<GradingResult> custom({
    Expression<String>? id,
    Expression<String>? submissionId,
    Expression<String>? studentId,
    Expression<String>? courseId,
    Expression<String>? questionId,
    Expression<double>? score,
    Expression<double>? maxScore,
    Expression<double>? percentage,
    Expression<String>? reasoning,
    Expression<String>? feedback,
    Expression<String>? grader,
    Expression<double>? confidence,
    Expression<String>? status,
    Expression<String>? failureReason,
    Expression<bool>? isOverridden,
    Expression<double>? overrideScore,
    Expression<String>? overrideNote,
    Expression<int>? syncStatus,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (submissionId != null) 'submission_id': submissionId,
      if (studentId != null) 'student_id': studentId,
      if (courseId != null) 'course_id': courseId,
      if (questionId != null) 'question_id': questionId,
      if (score != null) 'score': score,
      if (maxScore != null) 'max_score': maxScore,
      if (percentage != null) 'percentage': percentage,
      if (reasoning != null) 'reasoning': reasoning,
      if (feedback != null) 'feedback': feedback,
      if (grader != null) 'grader': grader,
      if (confidence != null) 'confidence': confidence,
      if (status != null) 'status': status,
      if (failureReason != null) 'failure_reason': failureReason,
      if (isOverridden != null) 'is_overridden': isOverridden,
      if (overrideScore != null) 'override_score': overrideScore,
      if (overrideNote != null) 'override_note': overrideNote,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  GradingResultsCompanion copyWith(
      {Value<String>? id,
      Value<String>? submissionId,
      Value<String>? studentId,
      Value<String>? courseId,
      Value<String>? questionId,
      Value<double>? score,
      Value<double>? maxScore,
      Value<double>? percentage,
      Value<String>? reasoning,
      Value<String>? feedback,
      Value<String>? grader,
      Value<double>? confidence,
      Value<String>? status,
      Value<String?>? failureReason,
      Value<bool>? isOverridden,
      Value<double?>? overrideScore,
      Value<String?>? overrideNote,
      Value<int>? syncStatus,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return GradingResultsCompanion(
      id: id ?? this.id,
      submissionId: submissionId ?? this.submissionId,
      studentId: studentId ?? this.studentId,
      courseId: courseId ?? this.courseId,
      questionId: questionId ?? this.questionId,
      score: score ?? this.score,
      maxScore: maxScore ?? this.maxScore,
      percentage: percentage ?? this.percentage,
      reasoning: reasoning ?? this.reasoning,
      feedback: feedback ?? this.feedback,
      grader: grader ?? this.grader,
      confidence: confidence ?? this.confidence,
      status: status ?? this.status,
      failureReason: failureReason ?? this.failureReason,
      isOverridden: isOverridden ?? this.isOverridden,
      overrideScore: overrideScore ?? this.overrideScore,
      overrideNote: overrideNote ?? this.overrideNote,
      syncStatus: syncStatus ?? this.syncStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (submissionId.present) {
      map['submission_id'] = Variable<String>(submissionId.value);
    }
    if (studentId.present) {
      map['student_id'] = Variable<String>(studentId.value);
    }
    if (courseId.present) {
      map['course_id'] = Variable<String>(courseId.value);
    }
    if (questionId.present) {
      map['question_id'] = Variable<String>(questionId.value);
    }
    if (score.present) {
      map['score'] = Variable<double>(score.value);
    }
    if (maxScore.present) {
      map['max_score'] = Variable<double>(maxScore.value);
    }
    if (percentage.present) {
      map['percentage'] = Variable<double>(percentage.value);
    }
    if (reasoning.present) {
      map['reasoning'] = Variable<String>(reasoning.value);
    }
    if (feedback.present) {
      map['feedback'] = Variable<String>(feedback.value);
    }
    if (grader.present) {
      map['grader'] = Variable<String>(grader.value);
    }
    if (confidence.present) {
      map['confidence'] = Variable<double>(confidence.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (failureReason.present) {
      map['failure_reason'] = Variable<String>(failureReason.value);
    }
    if (isOverridden.present) {
      map['is_overridden'] = Variable<bool>(isOverridden.value);
    }
    if (overrideScore.present) {
      map['override_score'] = Variable<double>(overrideScore.value);
    }
    if (overrideNote.present) {
      map['override_note'] = Variable<String>(overrideNote.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(syncStatus.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('GradingResultsCompanion(')
          ..write('id: $id, ')
          ..write('submissionId: $submissionId, ')
          ..write('studentId: $studentId, ')
          ..write('courseId: $courseId, ')
          ..write('questionId: $questionId, ')
          ..write('score: $score, ')
          ..write('maxScore: $maxScore, ')
          ..write('percentage: $percentage, ')
          ..write('reasoning: $reasoning, ')
          ..write('feedback: $feedback, ')
          ..write('grader: $grader, ')
          ..write('confidence: $confidence, ')
          ..write('status: $status, ')
          ..write('failureReason: $failureReason, ')
          ..write('isOverridden: $isOverridden, ')
          ..write('overrideScore: $overrideScore, ')
          ..write('overrideNote: $overrideNote, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $CoursesTable courses = $CoursesTable(this);
  late final $ExamsTable exams = $ExamsTable(this);
  late final $StudentsTable students = $StudentsTable(this);
  late final $SubmissionsTable submissions = $SubmissionsTable(this);
  late final $ScannedPagesTable scannedPages = $ScannedPagesTable(this);
  late final $GradingResultsTable gradingResults = $GradingResultsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities =>
      [courses, exams, students, submissions, scannedPages, gradingResults];
}

typedef $$CoursesTableCreateCompanionBuilder = CoursesCompanion Function({
  required String id,
  Value<String?> serverId,
  Value<int> syncStatus,
  required String name,
  required String examTitle,
  Value<String?> department,
  Value<String> status,
  Value<int> totalStudents,
  Value<int> gradedCount,
  Value<String?> questionPaperPath,
  Value<String?> answerKeyPath,
  Value<String?> questionPaperType,
  Value<String?> answerKeyType,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});
typedef $$CoursesTableUpdateCompanionBuilder = CoursesCompanion Function({
  Value<String> id,
  Value<String?> serverId,
  Value<int> syncStatus,
  Value<String> name,
  Value<String> examTitle,
  Value<String?> department,
  Value<String> status,
  Value<int> totalStudents,
  Value<int> gradedCount,
  Value<String?> questionPaperPath,
  Value<String?> answerKeyPath,
  Value<String?> questionPaperType,
  Value<String?> answerKeyType,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$CoursesTableFilterComposer
    extends Composer<_$AppDatabase, $CoursesTable> {
  $$CoursesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get examTitle => $composableBuilder(
      column: $table.examTitle, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get department => $composableBuilder(
      column: $table.department, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get totalStudents => $composableBuilder(
      column: $table.totalStudents, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get gradedCount => $composableBuilder(
      column: $table.gradedCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get questionPaperPath => $composableBuilder(
      column: $table.questionPaperPath,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get answerKeyPath => $composableBuilder(
      column: $table.answerKeyPath, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get questionPaperType => $composableBuilder(
      column: $table.questionPaperType,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get answerKeyType => $composableBuilder(
      column: $table.answerKeyType, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$CoursesTableOrderingComposer
    extends Composer<_$AppDatabase, $CoursesTable> {
  $$CoursesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get examTitle => $composableBuilder(
      column: $table.examTitle, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get department => $composableBuilder(
      column: $table.department, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get totalStudents => $composableBuilder(
      column: $table.totalStudents,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get gradedCount => $composableBuilder(
      column: $table.gradedCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get questionPaperPath => $composableBuilder(
      column: $table.questionPaperPath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get answerKeyPath => $composableBuilder(
      column: $table.answerKeyPath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get questionPaperType => $composableBuilder(
      column: $table.questionPaperType,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get answerKeyType => $composableBuilder(
      column: $table.answerKeyType,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$CoursesTableAnnotationComposer
    extends Composer<_$AppDatabase, $CoursesTable> {
  $$CoursesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get serverId =>
      $composableBuilder(column: $table.serverId, builder: (column) => column);

  GeneratedColumn<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get examTitle =>
      $composableBuilder(column: $table.examTitle, builder: (column) => column);

  GeneratedColumn<String> get department => $composableBuilder(
      column: $table.department, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get totalStudents => $composableBuilder(
      column: $table.totalStudents, builder: (column) => column);

  GeneratedColumn<int> get gradedCount => $composableBuilder(
      column: $table.gradedCount, builder: (column) => column);

  GeneratedColumn<String> get questionPaperPath => $composableBuilder(
      column: $table.questionPaperPath, builder: (column) => column);

  GeneratedColumn<String> get answerKeyPath => $composableBuilder(
      column: $table.answerKeyPath, builder: (column) => column);

  GeneratedColumn<String> get questionPaperType => $composableBuilder(
      column: $table.questionPaperType, builder: (column) => column);

  GeneratedColumn<String> get answerKeyType => $composableBuilder(
      column: $table.answerKeyType, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$CoursesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $CoursesTable,
    Course,
    $$CoursesTableFilterComposer,
    $$CoursesTableOrderingComposer,
    $$CoursesTableAnnotationComposer,
    $$CoursesTableCreateCompanionBuilder,
    $$CoursesTableUpdateCompanionBuilder,
    (Course, BaseReferences<_$AppDatabase, $CoursesTable, Course>),
    Course,
    PrefetchHooks Function()> {
  $$CoursesTableTableManager(_$AppDatabase db, $CoursesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CoursesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CoursesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CoursesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String?> serverId = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String> examTitle = const Value.absent(),
            Value<String?> department = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> totalStudents = const Value.absent(),
            Value<int> gradedCount = const Value.absent(),
            Value<String?> questionPaperPath = const Value.absent(),
            Value<String?> answerKeyPath = const Value.absent(),
            Value<String?> questionPaperType = const Value.absent(),
            Value<String?> answerKeyType = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              CoursesCompanion(
            id: id,
            serverId: serverId,
            syncStatus: syncStatus,
            name: name,
            examTitle: examTitle,
            department: department,
            status: status,
            totalStudents: totalStudents,
            gradedCount: gradedCount,
            questionPaperPath: questionPaperPath,
            answerKeyPath: answerKeyPath,
            questionPaperType: questionPaperType,
            answerKeyType: answerKeyType,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            Value<String?> serverId = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            required String name,
            required String examTitle,
            Value<String?> department = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> totalStudents = const Value.absent(),
            Value<int> gradedCount = const Value.absent(),
            Value<String?> questionPaperPath = const Value.absent(),
            Value<String?> answerKeyPath = const Value.absent(),
            Value<String?> questionPaperType = const Value.absent(),
            Value<String?> answerKeyType = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              CoursesCompanion.insert(
            id: id,
            serverId: serverId,
            syncStatus: syncStatus,
            name: name,
            examTitle: examTitle,
            department: department,
            status: status,
            totalStudents: totalStudents,
            gradedCount: gradedCount,
            questionPaperPath: questionPaperPath,
            answerKeyPath: answerKeyPath,
            questionPaperType: questionPaperType,
            answerKeyType: answerKeyType,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$CoursesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $CoursesTable,
    Course,
    $$CoursesTableFilterComposer,
    $$CoursesTableOrderingComposer,
    $$CoursesTableAnnotationComposer,
    $$CoursesTableCreateCompanionBuilder,
    $$CoursesTableUpdateCompanionBuilder,
    (Course, BaseReferences<_$AppDatabase, $CoursesTable, Course>),
    Course,
    PrefetchHooks Function()>;
typedef $$ExamsTableCreateCompanionBuilder = ExamsCompanion Function({
  required String id,
  Value<String?> serverId,
  Value<int> syncStatus,
  required String courseId,
  required String title,
  Value<int> totalMarks,
  Value<String?> questionPaperPath,
  Value<String?> answerKeyPath,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});
typedef $$ExamsTableUpdateCompanionBuilder = ExamsCompanion Function({
  Value<String> id,
  Value<String?> serverId,
  Value<int> syncStatus,
  Value<String> courseId,
  Value<String> title,
  Value<int> totalMarks,
  Value<String?> questionPaperPath,
  Value<String?> answerKeyPath,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$ExamsTableFilterComposer extends Composer<_$AppDatabase, $ExamsTable> {
  $$ExamsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get courseId => $composableBuilder(
      column: $table.courseId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get title => $composableBuilder(
      column: $table.title, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get totalMarks => $composableBuilder(
      column: $table.totalMarks, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get questionPaperPath => $composableBuilder(
      column: $table.questionPaperPath,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get answerKeyPath => $composableBuilder(
      column: $table.answerKeyPath, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$ExamsTableOrderingComposer
    extends Composer<_$AppDatabase, $ExamsTable> {
  $$ExamsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get courseId => $composableBuilder(
      column: $table.courseId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get title => $composableBuilder(
      column: $table.title, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get totalMarks => $composableBuilder(
      column: $table.totalMarks, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get questionPaperPath => $composableBuilder(
      column: $table.questionPaperPath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get answerKeyPath => $composableBuilder(
      column: $table.answerKeyPath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$ExamsTableAnnotationComposer
    extends Composer<_$AppDatabase, $ExamsTable> {
  $$ExamsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get serverId =>
      $composableBuilder(column: $table.serverId, builder: (column) => column);

  GeneratedColumn<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<String> get courseId =>
      $composableBuilder(column: $table.courseId, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<int> get totalMarks => $composableBuilder(
      column: $table.totalMarks, builder: (column) => column);

  GeneratedColumn<String> get questionPaperPath => $composableBuilder(
      column: $table.questionPaperPath, builder: (column) => column);

  GeneratedColumn<String> get answerKeyPath => $composableBuilder(
      column: $table.answerKeyPath, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$ExamsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $ExamsTable,
    Exam,
    $$ExamsTableFilterComposer,
    $$ExamsTableOrderingComposer,
    $$ExamsTableAnnotationComposer,
    $$ExamsTableCreateCompanionBuilder,
    $$ExamsTableUpdateCompanionBuilder,
    (Exam, BaseReferences<_$AppDatabase, $ExamsTable, Exam>),
    Exam,
    PrefetchHooks Function()> {
  $$ExamsTableTableManager(_$AppDatabase db, $ExamsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ExamsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ExamsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ExamsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String?> serverId = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            Value<String> courseId = const Value.absent(),
            Value<String> title = const Value.absent(),
            Value<int> totalMarks = const Value.absent(),
            Value<String?> questionPaperPath = const Value.absent(),
            Value<String?> answerKeyPath = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              ExamsCompanion(
            id: id,
            serverId: serverId,
            syncStatus: syncStatus,
            courseId: courseId,
            title: title,
            totalMarks: totalMarks,
            questionPaperPath: questionPaperPath,
            answerKeyPath: answerKeyPath,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            Value<String?> serverId = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            required String courseId,
            required String title,
            Value<int> totalMarks = const Value.absent(),
            Value<String?> questionPaperPath = const Value.absent(),
            Value<String?> answerKeyPath = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              ExamsCompanion.insert(
            id: id,
            serverId: serverId,
            syncStatus: syncStatus,
            courseId: courseId,
            title: title,
            totalMarks: totalMarks,
            questionPaperPath: questionPaperPath,
            answerKeyPath: answerKeyPath,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$ExamsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $ExamsTable,
    Exam,
    $$ExamsTableFilterComposer,
    $$ExamsTableOrderingComposer,
    $$ExamsTableAnnotationComposer,
    $$ExamsTableCreateCompanionBuilder,
    $$ExamsTableUpdateCompanionBuilder,
    (Exam, BaseReferences<_$AppDatabase, $ExamsTable, Exam>),
    Exam,
    PrefetchHooks Function()>;
typedef $$StudentsTableCreateCompanionBuilder = StudentsCompanion Function({
  required String id,
  Value<String?> serverId,
  Value<int> syncStatus,
  required String courseId,
  required String name,
  required String rollNumber,
  Value<String> gradingStatus,
  Value<double?> totalScore,
  Value<double?> maxScore,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});
typedef $$StudentsTableUpdateCompanionBuilder = StudentsCompanion Function({
  Value<String> id,
  Value<String?> serverId,
  Value<int> syncStatus,
  Value<String> courseId,
  Value<String> name,
  Value<String> rollNumber,
  Value<String> gradingStatus,
  Value<double?> totalScore,
  Value<double?> maxScore,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$StudentsTableFilterComposer
    extends Composer<_$AppDatabase, $StudentsTable> {
  $$StudentsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get courseId => $composableBuilder(
      column: $table.courseId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get rollNumber => $composableBuilder(
      column: $table.rollNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get gradingStatus => $composableBuilder(
      column: $table.gradingStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get totalScore => $composableBuilder(
      column: $table.totalScore, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get maxScore => $composableBuilder(
      column: $table.maxScore, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$StudentsTableOrderingComposer
    extends Composer<_$AppDatabase, $StudentsTable> {
  $$StudentsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get courseId => $composableBuilder(
      column: $table.courseId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get rollNumber => $composableBuilder(
      column: $table.rollNumber, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get gradingStatus => $composableBuilder(
      column: $table.gradingStatus,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get totalScore => $composableBuilder(
      column: $table.totalScore, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get maxScore => $composableBuilder(
      column: $table.maxScore, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$StudentsTableAnnotationComposer
    extends Composer<_$AppDatabase, $StudentsTable> {
  $$StudentsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get serverId =>
      $composableBuilder(column: $table.serverId, builder: (column) => column);

  GeneratedColumn<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<String> get courseId =>
      $composableBuilder(column: $table.courseId, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get rollNumber => $composableBuilder(
      column: $table.rollNumber, builder: (column) => column);

  GeneratedColumn<String> get gradingStatus => $composableBuilder(
      column: $table.gradingStatus, builder: (column) => column);

  GeneratedColumn<double> get totalScore => $composableBuilder(
      column: $table.totalScore, builder: (column) => column);

  GeneratedColumn<double> get maxScore =>
      $composableBuilder(column: $table.maxScore, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$StudentsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $StudentsTable,
    Student,
    $$StudentsTableFilterComposer,
    $$StudentsTableOrderingComposer,
    $$StudentsTableAnnotationComposer,
    $$StudentsTableCreateCompanionBuilder,
    $$StudentsTableUpdateCompanionBuilder,
    (Student, BaseReferences<_$AppDatabase, $StudentsTable, Student>),
    Student,
    PrefetchHooks Function()> {
  $$StudentsTableTableManager(_$AppDatabase db, $StudentsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$StudentsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$StudentsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$StudentsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String?> serverId = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            Value<String> courseId = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String> rollNumber = const Value.absent(),
            Value<String> gradingStatus = const Value.absent(),
            Value<double?> totalScore = const Value.absent(),
            Value<double?> maxScore = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              StudentsCompanion(
            id: id,
            serverId: serverId,
            syncStatus: syncStatus,
            courseId: courseId,
            name: name,
            rollNumber: rollNumber,
            gradingStatus: gradingStatus,
            totalScore: totalScore,
            maxScore: maxScore,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            Value<String?> serverId = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            required String courseId,
            required String name,
            required String rollNumber,
            Value<String> gradingStatus = const Value.absent(),
            Value<double?> totalScore = const Value.absent(),
            Value<double?> maxScore = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              StudentsCompanion.insert(
            id: id,
            serverId: serverId,
            syncStatus: syncStatus,
            courseId: courseId,
            name: name,
            rollNumber: rollNumber,
            gradingStatus: gradingStatus,
            totalScore: totalScore,
            maxScore: maxScore,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$StudentsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $StudentsTable,
    Student,
    $$StudentsTableFilterComposer,
    $$StudentsTableOrderingComposer,
    $$StudentsTableAnnotationComposer,
    $$StudentsTableCreateCompanionBuilder,
    $$StudentsTableUpdateCompanionBuilder,
    (Student, BaseReferences<_$AppDatabase, $StudentsTable, Student>),
    Student,
    PrefetchHooks Function()>;
typedef $$SubmissionsTableCreateCompanionBuilder = SubmissionsCompanion
    Function({
  required String id,
  Value<String?> serverId,
  Value<int> syncStatus,
  required String studentId,
  required String courseId,
  Value<String> status,
  Value<String?> coverPagePath,
  Value<bool> gradingRequested,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});
typedef $$SubmissionsTableUpdateCompanionBuilder = SubmissionsCompanion
    Function({
  Value<String> id,
  Value<String?> serverId,
  Value<int> syncStatus,
  Value<String> studentId,
  Value<String> courseId,
  Value<String> status,
  Value<String?> coverPagePath,
  Value<bool> gradingRequested,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$SubmissionsTableFilterComposer
    extends Composer<_$AppDatabase, $SubmissionsTable> {
  $$SubmissionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get studentId => $composableBuilder(
      column: $table.studentId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get courseId => $composableBuilder(
      column: $table.courseId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get coverPagePath => $composableBuilder(
      column: $table.coverPagePath, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get gradingRequested => $composableBuilder(
      column: $table.gradingRequested,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$SubmissionsTableOrderingComposer
    extends Composer<_$AppDatabase, $SubmissionsTable> {
  $$SubmissionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get studentId => $composableBuilder(
      column: $table.studentId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get courseId => $composableBuilder(
      column: $table.courseId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get coverPagePath => $composableBuilder(
      column: $table.coverPagePath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get gradingRequested => $composableBuilder(
      column: $table.gradingRequested,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$SubmissionsTableAnnotationComposer
    extends Composer<_$AppDatabase, $SubmissionsTable> {
  $$SubmissionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get serverId =>
      $composableBuilder(column: $table.serverId, builder: (column) => column);

  GeneratedColumn<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<String> get studentId =>
      $composableBuilder(column: $table.studentId, builder: (column) => column);

  GeneratedColumn<String> get courseId =>
      $composableBuilder(column: $table.courseId, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get coverPagePath => $composableBuilder(
      column: $table.coverPagePath, builder: (column) => column);

  GeneratedColumn<bool> get gradingRequested => $composableBuilder(
      column: $table.gradingRequested, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$SubmissionsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SubmissionsTable,
    Submission,
    $$SubmissionsTableFilterComposer,
    $$SubmissionsTableOrderingComposer,
    $$SubmissionsTableAnnotationComposer,
    $$SubmissionsTableCreateCompanionBuilder,
    $$SubmissionsTableUpdateCompanionBuilder,
    (Submission, BaseReferences<_$AppDatabase, $SubmissionsTable, Submission>),
    Submission,
    PrefetchHooks Function()> {
  $$SubmissionsTableTableManager(_$AppDatabase db, $SubmissionsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SubmissionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SubmissionsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SubmissionsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String?> serverId = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            Value<String> studentId = const Value.absent(),
            Value<String> courseId = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String?> coverPagePath = const Value.absent(),
            Value<bool> gradingRequested = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              SubmissionsCompanion(
            id: id,
            serverId: serverId,
            syncStatus: syncStatus,
            studentId: studentId,
            courseId: courseId,
            status: status,
            coverPagePath: coverPagePath,
            gradingRequested: gradingRequested,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            Value<String?> serverId = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            required String studentId,
            required String courseId,
            Value<String> status = const Value.absent(),
            Value<String?> coverPagePath = const Value.absent(),
            Value<bool> gradingRequested = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              SubmissionsCompanion.insert(
            id: id,
            serverId: serverId,
            syncStatus: syncStatus,
            studentId: studentId,
            courseId: courseId,
            status: status,
            coverPagePath: coverPagePath,
            gradingRequested: gradingRequested,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$SubmissionsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SubmissionsTable,
    Submission,
    $$SubmissionsTableFilterComposer,
    $$SubmissionsTableOrderingComposer,
    $$SubmissionsTableAnnotationComposer,
    $$SubmissionsTableCreateCompanionBuilder,
    $$SubmissionsTableUpdateCompanionBuilder,
    (Submission, BaseReferences<_$AppDatabase, $SubmissionsTable, Submission>),
    Submission,
    PrefetchHooks Function()>;
typedef $$ScannedPagesTableCreateCompanionBuilder = ScannedPagesCompanion
    Function({
  required String id,
  Value<String?> serverId,
  Value<int> syncStatus,
  required String submissionId,
  required int pageNumber,
  required String localPath,
  Value<String?> uploadedUrl,
  Value<bool> isBlurry,
  Value<String> type,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});
typedef $$ScannedPagesTableUpdateCompanionBuilder = ScannedPagesCompanion
    Function({
  Value<String> id,
  Value<String?> serverId,
  Value<int> syncStatus,
  Value<String> submissionId,
  Value<int> pageNumber,
  Value<String> localPath,
  Value<String?> uploadedUrl,
  Value<bool> isBlurry,
  Value<String> type,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$ScannedPagesTableFilterComposer
    extends Composer<_$AppDatabase, $ScannedPagesTable> {
  $$ScannedPagesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get submissionId => $composableBuilder(
      column: $table.submissionId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get pageNumber => $composableBuilder(
      column: $table.pageNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get localPath => $composableBuilder(
      column: $table.localPath, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get uploadedUrl => $composableBuilder(
      column: $table.uploadedUrl, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isBlurry => $composableBuilder(
      column: $table.isBlurry, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$ScannedPagesTableOrderingComposer
    extends Composer<_$AppDatabase, $ScannedPagesTable> {
  $$ScannedPagesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get submissionId => $composableBuilder(
      column: $table.submissionId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get pageNumber => $composableBuilder(
      column: $table.pageNumber, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get localPath => $composableBuilder(
      column: $table.localPath, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get uploadedUrl => $composableBuilder(
      column: $table.uploadedUrl, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isBlurry => $composableBuilder(
      column: $table.isBlurry, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$ScannedPagesTableAnnotationComposer
    extends Composer<_$AppDatabase, $ScannedPagesTable> {
  $$ScannedPagesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get serverId =>
      $composableBuilder(column: $table.serverId, builder: (column) => column);

  GeneratedColumn<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<String> get submissionId => $composableBuilder(
      column: $table.submissionId, builder: (column) => column);

  GeneratedColumn<int> get pageNumber => $composableBuilder(
      column: $table.pageNumber, builder: (column) => column);

  GeneratedColumn<String> get localPath =>
      $composableBuilder(column: $table.localPath, builder: (column) => column);

  GeneratedColumn<String> get uploadedUrl => $composableBuilder(
      column: $table.uploadedUrl, builder: (column) => column);

  GeneratedColumn<bool> get isBlurry =>
      $composableBuilder(column: $table.isBlurry, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$ScannedPagesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $ScannedPagesTable,
    ScannedPage,
    $$ScannedPagesTableFilterComposer,
    $$ScannedPagesTableOrderingComposer,
    $$ScannedPagesTableAnnotationComposer,
    $$ScannedPagesTableCreateCompanionBuilder,
    $$ScannedPagesTableUpdateCompanionBuilder,
    (
      ScannedPage,
      BaseReferences<_$AppDatabase, $ScannedPagesTable, ScannedPage>
    ),
    ScannedPage,
    PrefetchHooks Function()> {
  $$ScannedPagesTableTableManager(_$AppDatabase db, $ScannedPagesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ScannedPagesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ScannedPagesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ScannedPagesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String?> serverId = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            Value<String> submissionId = const Value.absent(),
            Value<int> pageNumber = const Value.absent(),
            Value<String> localPath = const Value.absent(),
            Value<String?> uploadedUrl = const Value.absent(),
            Value<bool> isBlurry = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              ScannedPagesCompanion(
            id: id,
            serverId: serverId,
            syncStatus: syncStatus,
            submissionId: submissionId,
            pageNumber: pageNumber,
            localPath: localPath,
            uploadedUrl: uploadedUrl,
            isBlurry: isBlurry,
            type: type,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            Value<String?> serverId = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            required String submissionId,
            required int pageNumber,
            required String localPath,
            Value<String?> uploadedUrl = const Value.absent(),
            Value<bool> isBlurry = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              ScannedPagesCompanion.insert(
            id: id,
            serverId: serverId,
            syncStatus: syncStatus,
            submissionId: submissionId,
            pageNumber: pageNumber,
            localPath: localPath,
            uploadedUrl: uploadedUrl,
            isBlurry: isBlurry,
            type: type,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$ScannedPagesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $ScannedPagesTable,
    ScannedPage,
    $$ScannedPagesTableFilterComposer,
    $$ScannedPagesTableOrderingComposer,
    $$ScannedPagesTableAnnotationComposer,
    $$ScannedPagesTableCreateCompanionBuilder,
    $$ScannedPagesTableUpdateCompanionBuilder,
    (
      ScannedPage,
      BaseReferences<_$AppDatabase, $ScannedPagesTable, ScannedPage>
    ),
    ScannedPage,
    PrefetchHooks Function()>;
typedef $$GradingResultsTableCreateCompanionBuilder = GradingResultsCompanion
    Function({
  required String id,
  required String submissionId,
  required String studentId,
  required String courseId,
  required String questionId,
  required double score,
  required double maxScore,
  required double percentage,
  required String reasoning,
  required String feedback,
  required String grader,
  required double confidence,
  Value<String> status,
  Value<String?> failureReason,
  Value<bool> isOverridden,
  Value<double?> overrideScore,
  Value<String?> overrideNote,
  Value<int> syncStatus,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});
typedef $$GradingResultsTableUpdateCompanionBuilder = GradingResultsCompanion
    Function({
  Value<String> id,
  Value<String> submissionId,
  Value<String> studentId,
  Value<String> courseId,
  Value<String> questionId,
  Value<double> score,
  Value<double> maxScore,
  Value<double> percentage,
  Value<String> reasoning,
  Value<String> feedback,
  Value<String> grader,
  Value<double> confidence,
  Value<String> status,
  Value<String?> failureReason,
  Value<bool> isOverridden,
  Value<double?> overrideScore,
  Value<String?> overrideNote,
  Value<int> syncStatus,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$GradingResultsTableFilterComposer
    extends Composer<_$AppDatabase, $GradingResultsTable> {
  $$GradingResultsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get submissionId => $composableBuilder(
      column: $table.submissionId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get studentId => $composableBuilder(
      column: $table.studentId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get courseId => $composableBuilder(
      column: $table.courseId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get questionId => $composableBuilder(
      column: $table.questionId, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get score => $composableBuilder(
      column: $table.score, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get maxScore => $composableBuilder(
      column: $table.maxScore, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get percentage => $composableBuilder(
      column: $table.percentage, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get reasoning => $composableBuilder(
      column: $table.reasoning, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get feedback => $composableBuilder(
      column: $table.feedback, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get grader => $composableBuilder(
      column: $table.grader, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get confidence => $composableBuilder(
      column: $table.confidence, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get failureReason => $composableBuilder(
      column: $table.failureReason, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isOverridden => $composableBuilder(
      column: $table.isOverridden, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get overrideScore => $composableBuilder(
      column: $table.overrideScore, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get overrideNote => $composableBuilder(
      column: $table.overrideNote, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$GradingResultsTableOrderingComposer
    extends Composer<_$AppDatabase, $GradingResultsTable> {
  $$GradingResultsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get submissionId => $composableBuilder(
      column: $table.submissionId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get studentId => $composableBuilder(
      column: $table.studentId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get courseId => $composableBuilder(
      column: $table.courseId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get questionId => $composableBuilder(
      column: $table.questionId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get score => $composableBuilder(
      column: $table.score, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get maxScore => $composableBuilder(
      column: $table.maxScore, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get percentage => $composableBuilder(
      column: $table.percentage, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get reasoning => $composableBuilder(
      column: $table.reasoning, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get feedback => $composableBuilder(
      column: $table.feedback, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get grader => $composableBuilder(
      column: $table.grader, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get confidence => $composableBuilder(
      column: $table.confidence, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get failureReason => $composableBuilder(
      column: $table.failureReason,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isOverridden => $composableBuilder(
      column: $table.isOverridden,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get overrideScore => $composableBuilder(
      column: $table.overrideScore,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get overrideNote => $composableBuilder(
      column: $table.overrideNote,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$GradingResultsTableAnnotationComposer
    extends Composer<_$AppDatabase, $GradingResultsTable> {
  $$GradingResultsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get submissionId => $composableBuilder(
      column: $table.submissionId, builder: (column) => column);

  GeneratedColumn<String> get studentId =>
      $composableBuilder(column: $table.studentId, builder: (column) => column);

  GeneratedColumn<String> get courseId =>
      $composableBuilder(column: $table.courseId, builder: (column) => column);

  GeneratedColumn<String> get questionId => $composableBuilder(
      column: $table.questionId, builder: (column) => column);

  GeneratedColumn<double> get score =>
      $composableBuilder(column: $table.score, builder: (column) => column);

  GeneratedColumn<double> get maxScore =>
      $composableBuilder(column: $table.maxScore, builder: (column) => column);

  GeneratedColumn<double> get percentage => $composableBuilder(
      column: $table.percentage, builder: (column) => column);

  GeneratedColumn<String> get reasoning =>
      $composableBuilder(column: $table.reasoning, builder: (column) => column);

  GeneratedColumn<String> get feedback =>
      $composableBuilder(column: $table.feedback, builder: (column) => column);

  GeneratedColumn<String> get grader =>
      $composableBuilder(column: $table.grader, builder: (column) => column);

  GeneratedColumn<double> get confidence => $composableBuilder(
      column: $table.confidence, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get failureReason => $composableBuilder(
      column: $table.failureReason, builder: (column) => column);

  GeneratedColumn<bool> get isOverridden => $composableBuilder(
      column: $table.isOverridden, builder: (column) => column);

  GeneratedColumn<double> get overrideScore => $composableBuilder(
      column: $table.overrideScore, builder: (column) => column);

  GeneratedColumn<String> get overrideNote => $composableBuilder(
      column: $table.overrideNote, builder: (column) => column);

  GeneratedColumn<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$GradingResultsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $GradingResultsTable,
    GradingResult,
    $$GradingResultsTableFilterComposer,
    $$GradingResultsTableOrderingComposer,
    $$GradingResultsTableAnnotationComposer,
    $$GradingResultsTableCreateCompanionBuilder,
    $$GradingResultsTableUpdateCompanionBuilder,
    (
      GradingResult,
      BaseReferences<_$AppDatabase, $GradingResultsTable, GradingResult>
    ),
    GradingResult,
    PrefetchHooks Function()> {
  $$GradingResultsTableTableManager(
      _$AppDatabase db, $GradingResultsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$GradingResultsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$GradingResultsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$GradingResultsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> submissionId = const Value.absent(),
            Value<String> studentId = const Value.absent(),
            Value<String> courseId = const Value.absent(),
            Value<String> questionId = const Value.absent(),
            Value<double> score = const Value.absent(),
            Value<double> maxScore = const Value.absent(),
            Value<double> percentage = const Value.absent(),
            Value<String> reasoning = const Value.absent(),
            Value<String> feedback = const Value.absent(),
            Value<String> grader = const Value.absent(),
            Value<double> confidence = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String?> failureReason = const Value.absent(),
            Value<bool> isOverridden = const Value.absent(),
            Value<double?> overrideScore = const Value.absent(),
            Value<String?> overrideNote = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              GradingResultsCompanion(
            id: id,
            submissionId: submissionId,
            studentId: studentId,
            courseId: courseId,
            questionId: questionId,
            score: score,
            maxScore: maxScore,
            percentage: percentage,
            reasoning: reasoning,
            feedback: feedback,
            grader: grader,
            confidence: confidence,
            status: status,
            failureReason: failureReason,
            isOverridden: isOverridden,
            overrideScore: overrideScore,
            overrideNote: overrideNote,
            syncStatus: syncStatus,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String submissionId,
            required String studentId,
            required String courseId,
            required String questionId,
            required double score,
            required double maxScore,
            required double percentage,
            required String reasoning,
            required String feedback,
            required String grader,
            required double confidence,
            Value<String> status = const Value.absent(),
            Value<String?> failureReason = const Value.absent(),
            Value<bool> isOverridden = const Value.absent(),
            Value<double?> overrideScore = const Value.absent(),
            Value<String?> overrideNote = const Value.absent(),
            Value<int> syncStatus = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              GradingResultsCompanion.insert(
            id: id,
            submissionId: submissionId,
            studentId: studentId,
            courseId: courseId,
            questionId: questionId,
            score: score,
            maxScore: maxScore,
            percentage: percentage,
            reasoning: reasoning,
            feedback: feedback,
            grader: grader,
            confidence: confidence,
            status: status,
            failureReason: failureReason,
            isOverridden: isOverridden,
            overrideScore: overrideScore,
            overrideNote: overrideNote,
            syncStatus: syncStatus,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$GradingResultsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $GradingResultsTable,
    GradingResult,
    $$GradingResultsTableFilterComposer,
    $$GradingResultsTableOrderingComposer,
    $$GradingResultsTableAnnotationComposer,
    $$GradingResultsTableCreateCompanionBuilder,
    $$GradingResultsTableUpdateCompanionBuilder,
    (
      GradingResult,
      BaseReferences<_$AppDatabase, $GradingResultsTable, GradingResult>
    ),
    GradingResult,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$CoursesTableTableManager get courses =>
      $$CoursesTableTableManager(_db, _db.courses);
  $$ExamsTableTableManager get exams =>
      $$ExamsTableTableManager(_db, _db.exams);
  $$StudentsTableTableManager get students =>
      $$StudentsTableTableManager(_db, _db.students);
  $$SubmissionsTableTableManager get submissions =>
      $$SubmissionsTableTableManager(_db, _db.submissions);
  $$ScannedPagesTableTableManager get scannedPages =>
      $$ScannedPagesTableTableManager(_db, _db.scannedPages);
  $$GradingResultsTableTableManager get gradingResults =>
      $$GradingResultsTableTableManager(_db, _db.gradingResults);
}
