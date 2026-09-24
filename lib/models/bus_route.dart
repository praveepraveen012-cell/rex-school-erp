class BusStop {
  final String name;
  final String time;
  final String status; // 'passed', 'approaching', 'pending'
  final int distanceMeters;
  final bool isStudentStop;

  BusStop({
    required this.name,
    required this.time,
    required this.status,
    required this.distanceMeters,
    this.isStudentStop = false,
  });
}

class BusSchedule {
  final String title;
  final String departs;
  final String destination;
  final int currentStopIndex;
  final List<BusStop> stops;

  BusSchedule({
    required this.title,
    required this.departs,
    required this.destination,
    required this.currentStopIndex,
    required this.stops,
  });
}

class BusRoute {
  final String id;
  final String routeNumber;
  final String name;
  final String vehicleNo;
  final String model;
  final String driverName;
  final String driverPhone;
  final String attendantName;
  final String attendantPhone;
  final int speed;
  final String status;
  final BusSchedule morning;
  final BusSchedule evening;

  BusRoute({
    required this.id,
    required this.routeNumber,
    required this.name,
    required this.vehicleNo,
    required this.model,
    required this.driverName,
    required this.driverPhone,
    required this.attendantName,
    required this.attendantPhone,
    required this.speed,
    required this.status,
    required this.morning,
    required this.evening,
  });

  BusSchedule getSchedule(String mode) {
    return mode == 'morning' ? morning : evening;
  }
}
