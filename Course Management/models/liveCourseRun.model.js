const mongoose = require('mongoose');

const liveCourseRunSchema = new mongoose.Schema({
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date 
  },
  liveSessions: [{
    contentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true 
    },
    sectionId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true 
    },
    startTime: { 
      type: Date, 
      required: true 
    },
    endTime: { 
      type: Date, 
      required: true 
    },
    meetingLink: String,
    description: String
  }]
}, { timestamps: true });

liveCourseRunSchema.pre('save', async function(next) {
  const Course = mongoose.model('Course');
  const courseDoc = await Course.findById(this.course).lean();
  if (!courseDoc) return next(new Error("Course not found"));

  for (const session of this.liveSessions) {
    const section = courseDoc.curriculum.find(sec => sec._id.toString() === session.sectionId.toString());
    if (!section) {
      return next(new Error(`Section ${session.sectionId} not found in course`));
    }

    const validSessionIds = (section.sessions || []).map(s => s._id.toString());
    if (!validSessionIds.includes(session.contentId.toString())) {
      return next(new Error(`Content ${session.contentId} not found in section ${session.sectionId}`));
    }
  }

  next();
});
const LiveCourseRun = mongoose.model('LiveCourseRun', liveCourseRunSchema);

module.exports = LiveCourseRun;
