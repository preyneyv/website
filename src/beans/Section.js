import { unique } from '../utils';

class Section {
  constructor(oscar, course, sectionId, data) {
    const [crn, meetings, credits, scheduleTypeIndex, campusIndex, attributeIndices, gradeBasisIndex] = data;

    this.course = course;
    this.id = sectionId;
    this.crn = crn;
    this.credits = credits;
    this.scheduleType = oscar.scheduleTypes[scheduleTypeIndex];
    this.campus = oscar.campuses[campusIndex];
    this.attributes = attributeIndices.map(attributeIndex => oscar.attributes[attributeIndex]);
    this.gradeBasis = oscar.gradeBases[gradeBasisIndex];
    this.meetings = meetings.map(
      ([periodIndex, days, where, instructors, dateRangeIndex]) => ({
        period: oscar.periods[periodIndex],
        days: days === '&nbsp;' ? [] : [...days],
        where,
        instructors: instructors.map((instructor) =>
          instructor.replace(/ \(P\)$/, ''),
        ),
        dateRange: oscar.dateRanges[dateRangeIndex],
      }),
    );
    this.instructors = unique(
      this.meetings.reduce(
        (instructors, meeting) => [...instructors, ...meeting.instructors],
        [],
      ),
    );
  }
}

export default Section;
